import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
const supportedEvents = new Map([
    ["payment.succeeded", "succeeded"],
    ["payment.canceled", "canceled"],
]);

function log(fields) {
    process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...fields })}\n`);
}

function sendJson(response, status, body) {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
}

function secretMatches(header, expectedSecret) {
    if (!expectedSecret || !header?.startsWith("Bearer ")) return false;
    const supplied = Buffer.from(header.slice(7), "utf8");
    const expected = Buffer.from(expectedSecret, "utf8");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Payload too large"), { category: "payload_too_large" });
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw Object.assign(new Error("Invalid JSON"), { category: "invalid_payload" });
    }
}

function parseNotification(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const event = typeof body.event === "string" ? body.event : "";
    if (!supportedEvents.has(event)) return { event, supported: false };
    const object = body.object;
    const yookassaPaymentId = object && typeof object === "object" && typeof object.id === "string"
        ? object.id.trim()
        : "";
    if (!yookassaPaymentId) return null;
    const reason = object.cancellation_details && typeof object.cancellation_details === "object" &&
        typeof object.cancellation_details.reason === "string"
        ? object.cancellation_details.reason.trim()
        : "";
    if (event === "payment.canceled" && !reason) return null;
    return { event, supported: true, yookassaPaymentId, status: supportedEvents.get(event), cancellationReason: reason || null };
}

function validateConfig(config) {
    if (!config.webhookHealthSecret || !config.paymentInternalSecret || !config.b2cInternalUrl ||
        config.webhookHealthSecret === config.paymentInternalSecret) return false;
    try {
        const url = new URL(config.b2cInternalUrl);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function createWebhookServer(config, dependencies = {}) {
    const fetchImpl = dependencies.fetchImpl ?? fetch;
    return createServer(async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");

        if (request.method === "GET" && url.pathname === "/health") {
            if (!validateConfig(config)) return sendJson(response, 503, { ok: false });
            if (!secretMatches(request.headers.authorization, config.webhookHealthSecret)) {
                return sendJson(response, 401, { error: "Unauthorized" });
            }
            return sendJson(response, 200, { ok: true });
        }

        if (request.method !== "POST" || url.pathname !== "/yookassa/webhook") {
            return sendJson(response, 404, { error: "Not found" });
        }
        if (!validateConfig(config)) {
            log({ event: null, yookassaPaymentId: null, errorCategory: "invalid_configuration", httpStatus: 503 });
            return sendJson(response, 503, { error: "Service unavailable" });
        }

        let notification;
        try {
            notification = parseNotification(await readJson(request));
        } catch (error) {
            const status = error.category === "payload_too_large" ? 413 : 400;
            log({ event: null, yookassaPaymentId: null, errorCategory: error.category ?? "invalid_payload", httpStatus: status });
            return sendJson(response, status, { error: "Invalid payload" });
        }
        if (!notification) {
            log({ event: null, yookassaPaymentId: null, errorCategory: "invalid_payload", httpStatus: 400 });
            return sendJson(response, 400, { error: "Invalid payload" });
        }
        if (!notification.supported) {
            log({ event: notification.event, yookassaPaymentId: null, result: "ignored", httpStatus: 200 });
            return sendJson(response, 200, { ok: true, ignored: true });
        }

        const { event, yookassaPaymentId, status, cancellationReason } = notification;
        log({ event, yookassaPaymentId, result: "received" });
        const payload = { yookassaPaymentId, status };
        if (status === "canceled") payload.cancellationReason = cancellationReason;

        try {
            const upstream = await fetchImpl(
                new URL("/api/internal/payments/process-status", config.b2cInternalUrl),
                {
                    method: "POST",
                    headers: { authorization: `Bearer ${config.paymentInternalSecret}`, "content-type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
                },
            );
            if (upstream.ok) {
                log({ event, yookassaPaymentId, result: "processed", httpStatus: upstream.status });
                return sendJson(response, 200, { ok: true });
            }
            if (upstream.status === 400 || upstream.status === 404) {
                log({ event, yookassaPaymentId, result: "permanent_rejection", errorCategory: upstream.status === 404 ? "payment_not_found" : "invalid_request", httpStatus: upstream.status });
                return sendJson(response, 200, { ok: true, ignored: true });
            }
            const configurationError = upstream.status === 401 || upstream.status === 403;
            log({ event, yookassaPaymentId, errorCategory: configurationError ? "invalid_configuration" : "upstream_error", httpStatus: upstream.status });
            return sendJson(response, 502, { error: "Upstream processing failed" });
        } catch (error) {
            const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
            const statusCode = timedOut ? 504 : 502;
            log({ event, yookassaPaymentId, errorCategory: timedOut ? "upstream_timeout" : "upstream_network_error", httpStatus: statusCode });
            return sendJson(response, statusCode, { error: "Upstream unavailable" });
        }
    });
}

export const internals = { parseNotification, secretMatches };
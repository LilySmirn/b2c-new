const YOOKASSA_PAYMENTS_URL = "https://api.yookassa.ru/v3/payments";
const HEALTH_TIMEOUT_MS = 4_000;
const CREATE_TIMEOUT_MS = 10_000;

export type SafeYookassaError = {
    type?: string;
    code?: string;
    description?: string;
    parameter?: string;
};

export type YookassaCreateResult =
    | { outcome: "created"; id: string; status: "pending"; confirmationUrl: string }
    | { outcome: "rejected"; httpStatus: number; error: SafeYookassaError }
    | { outcome: "ambiguous"; httpStatus?: number; category: string; error?: SafeYookassaError };

export type WebhookHealthResult =
    | { ok: true }
    | { ok: false; category: string; httpStatus?: number };

function nonEmptyString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function formatRubAmount(amount: number): string {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid tariff amount");
    }
    return amount.toFixed(2);
}

function safeError(body: unknown): SafeYookassaError {
    if (body === null || typeof body !== "object") return {};
    const value = body as Record<string, unknown>;
    return {
        type: nonEmptyString(value.type),
        code: nonEmptyString(value.code),
        description: nonEmptyString(value.description),
        parameter: nonEmptyString(value.parameter),
    };
}

async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function checkWebhookHealth(): Promise<WebhookHealthResult> {
    const baseUrl = process.env.YOOKASSA_WEBHOOK_SERVICE_URL?.trim();
    const secret = process.env.WEBHOOK_HEALTH_SECRET?.trim();
    if (!baseUrl || !secret) return { ok: false, category: "configuration_missing" };

    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
            method: "GET",
            headers: { Authorization: `Bearer ${secret}` },
            cache: "no-store",
            signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        });
        if (response.status !== 200) {
            return { ok: false, category: "http_error", httpStatus: response.status };
        }
        const body = await readJson(response);
        return body !== null && typeof body === "object" && (body as { ok?: unknown }).ok === true
            ? { ok: true }
            : { ok: false, category: "invalid_response", httpStatus: response.status };
    } catch (error) {
        return {
            ok: false,
            category: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network_error",
        };
    }
}

export async function createYookassaPayment(input: {
    amount: number;
    idempotencyKey: string;
    orderNumber: string;
    tariffName: string;
    customerEmail: string;
}): Promise<YookassaCreateResult> {
    const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
    const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!shopId || !secretKey || !appUrl) {
        return { outcome: "rejected", httpStatus: 0, error: { code: "configuration_missing" } };
    }

    const body = {
        amount: { value: formatRubAmount(input.amount), currency: "RUB" },
        capture: true,
        confirmation: {
            type: "redirect",
            return_url: `${appUrl.replace(/\/$/, "")}/profile`,
        },
        description: `Заказ №${input.orderNumber}`,
        metadata: { order_id: input.orderNumber },
        receipt: {
            customer: { email: input.customerEmail },
            items: [{
                description: input.tariffName,
                quantity: 1,
                amount: { value: formatRubAmount(input.amount), currency: "RUB" },
                vat_code: 1,
                payment_mode: "full_payment",
                payment_subject: "service",
                measure: "piece",
            }],
            timezone: 3,
            internet: "true",
        },
    };

    try {
        const response = await fetch(YOOKASSA_PAYMENTS_URL, {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
                "Idempotence-Key": input.idempotencyKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
        });
        const responseBody = await readJson(response);

        if (!response.ok) {
            const error = safeError(responseBody);
            return response.status >= 400 && response.status < 500
                ? { outcome: "rejected", httpStatus: response.status, error }
                : { outcome: "ambiguous", httpStatus: response.status, category: "http_server_error", error };
        }

        const payment = responseBody as Record<string, unknown> | null;
        const confirmation = payment?.confirmation as Record<string, unknown> | undefined;
        const id = nonEmptyString(payment?.id);
        const confirmationUrl = nonEmptyString(confirmation?.confirmation_url);
        if (!id || payment?.status !== "pending" || !confirmationUrl) {
            return { outcome: "ambiguous", httpStatus: response.status, category: "invalid_success_response" };
        }
        return { outcome: "created", id, status: "pending", confirmationUrl };
    } catch (error) {
        return {
            outcome: "ambiguous",
            category: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "network_error",
        };
    }
}
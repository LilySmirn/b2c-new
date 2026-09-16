import assert from "node:assert/strict";
import { createServer, type Server } from "node:net";
import test from "node:test";
import {
    getTelegramSafeErrorCode,
    getTelegramSafeErrorDetails,
    parseTelegramApiError,
    sendTelegramRequest,
    TelegramTransportError,
} from "./telegramTransport";

const proxyNames = [
    "TELEGRAM_PROXY_HOST",
    "TELEGRAM_PROXY_PORT",
    "TELEGRAM_PROXY_USERNAME",
    "TELEGRAM_PROXY_PASSWORD",
    "TELEGRAM_PROXY_PROTOCOL",
] as const;

function configureProxy(port: number, protocol = "http"): void {
    process.env.TELEGRAM_PROXY_HOST = "127.0.0.1";
    process.env.TELEGRAM_PROXY_PORT = String(port);
    process.env.TELEGRAM_PROXY_USERNAME = "test-user";
    process.env.TELEGRAM_PROXY_PASSWORD = "test-password";
    process.env.TELEGRAM_PROXY_PROTOCOL = protocol;
}

async function listen(server: Server): Promise<number> {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    return address.port;
}

async function close(server: Server): Promise<void> {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test.afterEach(() => {
    for (const name of proxyNames) delete process.env[name];
});

test("classifies an HTTP 407 CONNECT response as proxy authentication failure", async () => {
    const server = createServer((socket) => {
        socket.once("data", () => socket.end("HTTP/1.1 407 Proxy Authentication Required\r\n\r\n"));
    });
    configureProxy(await listen(server));

    try {
        await assert.rejects(
            sendTelegramRequest("secret-token", { chat_id: "1", text: "test" }, 500),
            (error) => getTelegramSafeErrorCode(error) === "telegram_proxy_auth_failed",
        );
    } finally {
        await close(server);
    }
});

test("preserves the proxy socket timeout category", async () => {
    const server = createServer((socket) => socket.on("data", () => undefined));
    configureProxy(await listen(server));

    try {
        await assert.rejects(
            sendTelegramRequest("secret-token", { chat_id: "1", text: "test" }, 30),
            (error) => getTelegramSafeErrorCode(error) === "telegram_proxy_tcp_timeout",
        );
    } finally {
        await close(server);
    }
});

test("selects SOCKS5 and classifies rejected username/password authentication", async () => {
    const server = createServer((socket) => {
        let step = 0;
        socket.on("data", () => {
            if (step++ === 0) socket.write(Buffer.from([0x05, 0x02]));
            else socket.end(Buffer.from([0x01, 0x01]));
        });
    });
    configureProxy(await listen(server), "socks5");

    const { getTelegramTransportMode } = await import("./telegramTransport");
    assert.equal(getTelegramTransportMode(), "socks5_proxy");
    try {
        await assert.rejects(
            sendTelegramRequest("secret-token", { chat_id: "1", text: "test" }, 500),
            (error) => getTelegramSafeErrorCode(error) === "telegram_proxy_auth_failed",
        );
    } finally {
        await close(server);
    }
});

test("safe diagnostics expose the stage and system code but never an error message", () => {
    const error = new TelegramTransportError("telegram_proxy_tls_failed", "tls", "CERT_HAS_EXPIRED", "Error");
    assert.deepEqual(getTelegramSafeErrorDetails(error), {
        reason: "telegram_proxy_tls_failed",
        stage: "tls",
        errorName: "Error",
        errorCode: "CERT_HAS_EXPIRED",
    });

    const unknown = Object.assign(new Error("socks5://user:secret@proxy.invalid"), { code: "ECONNRESET" });
    assert.deepEqual(getTelegramSafeErrorDetails(unknown), {
        reason: "telegram_request_failed",
        stage: "telegram_request",
        errorName: "Error",
        errorCode: "ECONNRESET",
    });
    assert.doesNotMatch(JSON.stringify(getTelegramSafeErrorDetails(unknown)), /user|secret|proxy\.invalid/);
});

test("extracts only safe Telegram Bot API error fields and redacts known secrets", () => {
    const token = "123456:bot-token";
    const password = "proxy-password";
    const result = parseTelegramApiError(JSON.stringify({
        ok: false,
        error_code: 400,
        description: `Bad Request for /bot${token}: ${password}\nchat not found`,
        result: { text: "the complete outgoing message must not be exposed" },
        parameters: { secret: "another value" },
    }), [token, password]);

    assert.deepEqual(result, {
        ok: false,
        errorCode: 400,
        description: "Bad Request for /bot[REDACTED]: [REDACTED] chat not found",
    });
    assert.doesNotMatch(JSON.stringify(result), /bot-token|proxy-password|outgoing message|another value/);
});

test("ignores malformed and unrelated Telegram response bodies", () => {
    assert.equal(parseTelegramApiError("not JSON"), undefined);
    assert.equal(parseTelegramApiError(JSON.stringify({ result: { text: "message" } })), undefined);
});
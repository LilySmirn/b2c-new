import assert from "node:assert/strict";
import test from "node:test";
import { paymentNotificationType } from "./paymentTelegramNotifier";
import {
    sendTelegramNotification,
    telegramThreadEnvironmentVariables,
    type TelegramNotificationType,
} from "./telegramNotification";
import type { TelegramRequestResult } from "./telegramTransport";

const telegramEnvironmentNames = [
    "TELEGRAM_PAYMENT_BOT_TOKEN",
    "TELEGRAM_NOTIFICATIONS_CHAT_ID",
    ...Object.values(telegramThreadEnvironmentVariables),
] as const;

test.afterEach(() => {
    for (const name of telegramEnvironmentNames) delete process.env[name];
});

test("maps every notification type to its topic environment variable", () => {
    assert.deepEqual(telegramThreadEnvironmentVariables, {
        payment_success: "TELEGRAM_PAYMENTS_SUCCESS_THREAD_ID",
        payment_error: "TELEGRAM_PAYMENTS_ERRORS_THREAD_ID",
        general_error: "TELEGRAM_GENERAL_ERRORS_THREAD_ID",
        feedback: "TELEGRAM_FEEDBACK_THREAD_ID",
    });
});

test("all routes use the unified token/chat and pass the numeric message_thread_id", async () => {
    process.env.TELEGRAM_PAYMENT_BOT_TOKEN = "unified-token";
    process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID = "284467225";
    const types = Object.keys(telegramThreadEnvironmentVariables) as TelegramNotificationType[];
    const calls: Array<{ token: string; body: Record<string, unknown> }> = [];

    for (const [index, type] of types.entries()) {
        process.env[telegramThreadEnvironmentVariables[type]] = String(100 + index);
        const result = await sendTelegramNotification(type, `${type} test`, {
            request: async (token, body): Promise<TelegramRequestResult> => {
                calls.push({ token, body });
                return { ok: true, status: 200, transport: "direct" };
            },
        });
        assert.equal(result.sent, true);
    }

    assert.deepEqual(calls.map(({ token, body }) => ({ token, ...body })), types.map((type, index) => ({
        token: "unified-token",
        chat_id: "284467225",
        message_thread_id: 100 + index,
        text: `${type} test`,
    })));
});

test("a missing route thread does not prevent another configured route", async () => {
    process.env.TELEGRAM_PAYMENT_BOT_TOKEN = "unified-token";
    process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID = "284467225";
    process.env.TELEGRAM_PAYMENTS_SUCCESS_THREAD_ID = "123";

    const feedback = await sendTelegramNotification("feedback", "test");
    assert.equal(feedback.sent, false);
    assert.equal(feedback.reason, "missing_thread_id");

    const payment = await sendTelegramNotification("payment_success", "test", {
        request: async () => ({ ok: true, status: 200, transport: "direct" }),
    });
    assert.equal(payment.sent, true);
});

test("returns safe Telegram API diagnostics for non-2xx responses", async () => {
    process.env.TELEGRAM_PAYMENT_BOT_TOKEN = "unified-token";
    process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID = "284467225";
    process.env.TELEGRAM_GENERAL_ERRORS_THREAD_ID = "321";
    const result = await sendTelegramNotification("general_error", "test", {
        request: async () => ({
            ok: false,
            status: 400,
            transport: "socks5_proxy",
            telegramError: { ok: false, errorCode: 400, description: "Bad Request: thread not found" },
        }),
    });
    assert.deepEqual(result, {
        sent: false,
        reason: "telegram_api_http_error",
        status: 400,
        transport: "socks5_proxy",
        telegramErrorCode: 400,
        telegramDescription: "Bad Request: thread not found",
    });
});

test("payment success, card error, and processing error select their intended topics", () => {
    assert.equal(paymentNotificationType("success"), "payment_success");
    assert.equal(paymentNotificationType("card_error"), "payment_error");
    assert.equal(paymentNotificationType("error"), "payment_error");
});
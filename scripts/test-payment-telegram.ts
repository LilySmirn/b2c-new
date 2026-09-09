import { config } from "dotenv";
import { resolve } from "node:path";

type PaymentTelegramNotificationType = "error" | "card_error" | "success";

const chatIdEnvironmentVariables: Record<PaymentTelegramNotificationType, string> = {
    error: "TELEGRAM_PAYMENT_ERROR_CHAT_ID",
    card_error: "TELEGRAM_PAYMENT_CARD_ERROR_CHAT_ID",
    success: "TELEGRAM_PAYMENT_SUCCESS_CHAT_ID",
};

async function main(): Promise<void> {
    const type = process.argv[2] as PaymentTelegramNotificationType | undefined;
    if (type !== "error" && type !== "card_error" && type !== "success") {
        console.error("Usage: npx tsx scripts/test-payment-telegram.ts <error|card_error|success>");
        process.exitCode = 1;
        return;
    }

    const envPath = resolve(__dirname, "..", ".env");
    const loaded = config({ path: envPath, quiet: true });
    if (loaded.error) {
        throw new Error(`Не удалось загрузить корневой .env: ${envPath}`);
    }

    const chatIdEnvironmentVariable = chatIdEnvironmentVariables[type];
    if (!process.env.TELEGRAM_PAYMENT_BOT_TOKEN?.trim()) {
        throw new Error("В корневом .env отсутствует TELEGRAM_PAYMENT_BOT_TOKEN");
    }
    if (!process.env[chatIdEnvironmentVariable]?.trim()) {
        throw new Error(`В корневом .env отсутствует ${chatIdEnvironmentVariable}`);
    }

    // Load the helper only after dotenv has populated process.env.
    const { sendPaymentTelegramNotification } = await import("../app/lib/paymentTelegramNotifier");
    const originalFetch = globalThis.fetch;
    const telegramResult: {
        response: { ok: boolean; status: number } | null;
        requestError: unknown;
    } = { response: null, requestError: null };

    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
        try {
            const response = await originalFetch(...args);
            telegramResult.response = { ok: response.ok, status: response.status };
            return response;
        } catch (error) {
            telegramResult.requestError = error;
            throw error;
        }
    };

    try {
        await sendPaymentTelegramNotification(type, {
            user: "local-test@example.com",
            paymentId: "local-test-payment",
            yookassaPaymentId: "local-test-yookassa",
            tariff: "Локальный тест (test-tariff)",
            amount: "100.00",
            cancellationReason: "test_cancellation_reason",
            cancellationParty: "test",
            subscriptionExpiration: "2030-01-01T00:00:00.000Z",
            error: new Error("Тестовая внутренняя ошибка"),
            stage: "локальная проверка",
        });
    } finally {
        globalThis.fetch = originalFetch;
    }

    if (telegramResult.requestError) {
        throw new Error(`Telegram-сообщение типа ${type} не отправлено: ошибка сети или timeout`);
    }
    if (!telegramResult.response?.ok) {
        throw new Error(`Telegram-сообщение типа ${type} не отправлено: HTTP ${telegramResult.response?.status ?? "не получен"}`);
    }
    console.log(`Telegram-сообщение типа ${type} успешно отправлено (HTTP ${telegramResult.response.status}).`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
import { config } from "dotenv";
import { resolve } from "node:path";

async function main(): Promise<void> {
    const envPath = resolve(__dirname, "..", ".env");
    const loaded = config({ path: envPath, quiet: true });
    if (loaded.error) throw new Error(`Не удалось загрузить корневой .env: ${envPath}`);

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!token) throw new Error("В корневом .env отсутствует TELEGRAM_BOT_TOKEN");
    if (!chatId) throw new Error("В корневом .env отсутствует TELEGRAM_CHAT_ID");

    const {
        getTelegramSafeErrorCode,
        getTelegramTransportMode,
        sendTelegramRequest,
    } = await import("../app/lib/telegramTransport");
    const transport = getTelegramTransportMode();

    try {
        const result = await sendTelegramRequest(token, {
            chat_id: chatId,
            text: "Тест формы «Нужен корпоративный доступ?» (без создания заявки)",
        });
        if (!result.ok) throw new Error(`telegram_http_error_${result.status}`);
        console.log(`Тестовое сообщение отправлено (HTTP ${result.status}, transport: ${result.transport}).`);
    } catch (error) {
        console.error(`Тест формы не пройден (transport: ${transport}, reason: ${getTelegramSafeErrorCode(error)}).`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : "telegram_form_test_failed");
    process.exit(1);
});
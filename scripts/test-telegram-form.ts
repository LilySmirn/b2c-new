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
        getTelegramSafeErrorDetails,
        getTelegramTransportMode,
        sendTelegramRequest,
    } = await import("../app/lib/telegramTransport");
    const transport = getTelegramTransportMode();

    try {
        const result = await sendTelegramRequest(token, {
            chat_id: chatId,
            text: "Тест формы «Нужен корпоративный доступ?» (без создания заявки)",
        });
        if (!result.ok) {
            const telegramDetails = [
                result.telegramError?.errorCode !== undefined
                    ? `telegram_error_code: ${result.telegramError.errorCode}`
                    : "",
                result.telegramError?.description
                    ? `telegram_description: ${result.telegramError.description}`
                    : "",
            ].filter(Boolean).join(", ");
            console.error(
                `Тест формы не пройден (transport: ${result.transport}, reason: telegram_api_http_error, ` +
                `stage: telegram_response, status: ${result.status}${telegramDetails ? `, ${telegramDetails}` : ""}).`,
            );
            process.exitCode = 1;
            return;
        }
        console.log(`Тестовое сообщение отправлено (HTTP ${result.status}, transport: ${result.transport}).`);
    } catch (error) {
        const details = getTelegramSafeErrorDetails(error);
        const metadata = [
            `stage: ${details.stage}`,
            details.errorName ? `error_name: ${details.errorName}` : "",
            details.errorCode ? `error_code: ${details.errorCode}` : "",
        ].filter(Boolean).join(", ");
        console.error(`Тест формы не пройден (transport: ${transport}, reason: ${details.reason}, ${metadata}).`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : "telegram_form_test_failed");
    process.exit(1);
});
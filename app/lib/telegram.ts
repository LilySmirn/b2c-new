import {
    sendTelegramRequest,
    getTelegramSafeErrorCode,
} from "@/app/lib/telegramTransport";

export async function sendTelegramMessage(message: string) {
    const token = process.env.TELEGRAM_ERROR_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ERROR_CHAT_ID;

    if (!token) {
        console.error('Telegram token is missing in env');
        return;
    }

    if (!chatId) {
        console.error('Telegram chat id is missing in env');
        return;
    }

    try {
        await sendTelegramRequest(token, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
        });
    } catch (error) {
        console.error(getTelegramSafeErrorCode(error));
    }
}

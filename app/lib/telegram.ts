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
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });
    } catch (err) {
        console.error('Failed to send Telegram message', err);
    }
}

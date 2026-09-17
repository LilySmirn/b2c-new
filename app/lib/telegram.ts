import { sendTelegramNotification } from "./telegramNotification";

export async function sendTelegramMessage(message: string) {
    return sendTelegramNotification("general_error", message, { parseMode: "Markdown" });
}

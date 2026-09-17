import { resolve } from "node:path";
import { loadEnv } from "../config/load-env";

type Update = {
    message?: { chat?: { id?: number | string }; message_thread_id?: number; text?: string };
    channel_post?: { chat?: { id?: number | string }; message_thread_id?: number; text?: string };
};

async function main(): Promise<void> {
    loadEnv(resolve(__dirname, ".."), true);
    const token = process.env.TELEGRAM_PAYMENT_BOT_TOKEN?.trim();
    if (!token) throw new Error("missing_bot_token");
    const { sendTelegramApiRequest } = await import("../app/lib/telegramTransport");
    const response = await sendTelegramApiRequest(token, "getUpdates", {}, 10_000, true);
    if (!response.ok) throw new Error(`telegram_api_http_error (HTTP ${response.status}, transport: ${response.transport})`);
    const payload = JSON.parse(response.responseBody ?? "{}") as { result?: Update[] };
    for (const update of payload.result ?? []) {
        const message = update.message ?? update.channel_post;
        if (!message) continue;
        console.log(JSON.stringify({
            "chat.id": message.chat?.id,
            message_thread_id: message.message_thread_id,
            text: message.text,
        }));
    }
    console.log(`Получено обновлений: ${payload.result?.length ?? 0} (transport: ${response.transport}).`);
}

main().catch(async (error) => {
    const { getTelegramSafeErrorDetails } = await import("../app/lib/telegramTransport");
    console.error(getTelegramSafeErrorDetails(error));
    process.exit(1);
});
import {
    getTelegramSafeErrorDetails,
    getTelegramTransportMode,
    sendTelegramRequest,
    type TelegramRequestResult,
    type TelegramTransportMode,
} from "@/app/lib/telegramTransport";

const TELEGRAM_TIMEOUT_MS = 10_000;

export type TelegramNotificationType =
    | "payment_success"
    | "payment_error"
    | "general_error"
    | "feedback";

export const telegramThreadEnvironmentVariables: Record<TelegramNotificationType, string> = {
    payment_success: "TELEGRAM_PAYMENTS_SUCCESS_THREAD_ID",
    payment_error: "TELEGRAM_PAYMENTS_ERRORS_THREAD_ID",
    general_error: "TELEGRAM_GENERAL_ERRORS_THREAD_ID",
    feedback: "TELEGRAM_FEEDBACK_THREAD_ID",
};

export type TelegramNotificationResult = {
    sent: boolean;
    reason?: "missing_bot_token" | "missing_chat_id" | "missing_thread_id" | "invalid_thread_id" | "telegram_api_http_error" | "telegram_transport_error";
    status?: number;
    transport?: TelegramTransportMode;
    telegramErrorCode?: number;
    telegramDescription?: string;
};

type TelegramRequest = typeof sendTelegramRequest;

function diagnostic(type: TelegramNotificationType, result: TelegramNotificationResult): void {
    console.info("telegram_notification", {
        notificationType: type,
        sent: result.sent,
        reason: result.reason,
        transport: result.transport,
        httpStatus: result.status,
        telegramErrorCode: result.telegramErrorCode,
        telegramDescription: result.telegramDescription,
    });
}

/** The single server-side entry point for all Telegram notifications. */
export async function sendTelegramNotification(
    type: TelegramNotificationType,
    message: string,
    options: { parseMode?: "HTML" | "Markdown"; timeoutMs?: number; request?: TelegramRequest } = {},
): Promise<TelegramNotificationResult> {
    const token = process.env.TELEGRAM_PAYMENT_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_NOTIFICATIONS_CHAT_ID?.trim();
    const rawThreadId = process.env[telegramThreadEnvironmentVariables[type]]?.trim();

    if (!token || !chatId || !rawThreadId) {
        const result: TelegramNotificationResult = {
            sent: false,
            reason: !token ? "missing_bot_token" : !chatId ? "missing_chat_id" : "missing_thread_id",
        };
        diagnostic(type, result);
        return result;
    }

    const threadId = Number(rawThreadId);
    if (!Number.isSafeInteger(threadId) || threadId <= 0) {
        const result: TelegramNotificationResult = { sent: false, reason: "invalid_thread_id" };
        diagnostic(type, result);
        return result;
    }

    try {
        const response: TelegramRequestResult = await (options.request ?? sendTelegramRequest)(token, {
            chat_id: chatId,
            message_thread_id: threadId,
            text: message,
            ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
        }, options.timeoutMs ?? TELEGRAM_TIMEOUT_MS);
        const result: TelegramNotificationResult = {
            sent: response.ok,
            ...(!response.ok ? { reason: "telegram_api_http_error" as const } : {}),
            status: response.status,
            transport: response.transport,
            telegramErrorCode: response.telegramError?.errorCode,
            telegramDescription: response.telegramError?.description,
        };
        diagnostic(type, result);
        return result;
    } catch (error) {
        const details = getTelegramSafeErrorDetails(error);
        let transport: TelegramTransportMode | undefined;
        try {
            transport = getTelegramTransportMode();
        } catch {
            // Configuration diagnostics below are intentionally secret-free.
        }
        const result: TelegramNotificationResult = { sent: false, reason: "telegram_transport_error", transport };
        console.error("telegram_notification", { notificationType: type, sent: false, transport, ...details });
        return result;
    }
}
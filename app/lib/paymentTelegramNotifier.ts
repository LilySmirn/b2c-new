import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { getTelegramSafeErrorDetails, sendTelegramRequest, type TelegramTransportMode } from "@/app/lib/telegramTransport";

const TELEGRAM_TIMEOUT_MS = 5_000;

export type PaymentTelegramNotificationType = "error" | "card_error" | "success";

export type PaymentTelegramNotificationData = {
    user?: string | null;
    paymentId?: string | null;
    yookassaPaymentId?: string | null;
    tariff?: string | null;
    amount?: string | number | null;
    cancellationReason?: string | null;
    cancellationParty?: string | null;
    subscriptionExpiration?: Date | string | null;
    error?: unknown;
    stage?: string | null;
    timestamp?: Date | string;
};

export type PaymentTelegramNotificationResult = {
    sent: boolean;
    status?: number;
    transport?: TelegramTransportMode;
};

const chatIdEnvironmentVariables: Record<PaymentTelegramNotificationType, string> = {
    error: "TELEGRAM_PAYMENT_ERROR_CHAT_ID",
    card_error: "TELEGRAM_PAYMENT_CARD_ERROR_CHAT_ID",
    success: "TELEGRAM_PAYMENT_SUCCESS_CHAT_ID",
};

function present(value: unknown): string {
    if (value === null || value === undefined || value === "") return "неизвестно";
    return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 500);
}

function safeErrorMessage(error: unknown): string {
    if (error instanceof Error) return present(error.message);
    return typeof error === "string" ? present(error) : "Внутренняя ошибка";
}

function formatTimestamp(value: Date | string | undefined): string {
    const date = value instanceof Date ? value : value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function formatPaymentTelegramNotification(
    type: PaymentTelegramNotificationType,
    data: PaymentTelegramNotificationData,
): string {
    const common = [
        `Пользователь: ${present(data.user)}`,
        `Payment ID: ${present(data.paymentId)}`,
        `YooKassa Payment ID: ${present(data.yookassaPaymentId)}`,
        `Тариф: ${present(data.tariff)}`,
    ];
    const time = `Время: ${formatTimestamp(data.timestamp)}`;

    if (type === "error") {
        return ["🔴 Ошибка оплаты", "", ...common, "", `Ошибка: ${safeErrorMessage(data.error)}`, `Этап: ${present(data.stage)}`, time].join("\n");
    }
    if (type === "card_error") {
        return ["🟠 Оплата не прошла", "", ...common, `Сумма: ${present(data.amount)} RUB`, "", `Причина: ${present(data.cancellationReason)}`, `Сторона: ${present(data.cancellationParty)}`, time].join("\n");
    }
    return ["🟢 Успешная оплата", "", ...common, `Сумма: ${present(data.amount)} RUB`, `Новая дата окончания подписки: ${present(data.subscriptionExpiration)}`, "", time].join("\n");
}

/** Best-effort server-side notification. Telegram failures never escape this function. */
export async function sendPaymentTelegramNotification(
    type: PaymentTelegramNotificationType,
    data: PaymentTelegramNotificationData,
): Promise<PaymentTelegramNotificationResult> {
    const token = process.env.TELEGRAM_PAYMENT_BOT_TOKEN?.trim();
    const chatEnvironmentVariable = chatIdEnvironmentVariables[type];
    const chatId = process.env[chatEnvironmentVariable]?.trim();

    if (!token || !chatId) {
        await logPaymentEvent("telegram_payment_notification_skipped", data.paymentId ?? null, {
            notificationType: type,
            reason: token ? `missing_${chatEnvironmentVariable}` : "missing_bot_token",
        });
        return { sent: false };
    }

    try {
        const response = await sendTelegramRequest(token, {
            chat_id: chatId,
            text: formatPaymentTelegramNotification(type, data),
        }, TELEGRAM_TIMEOUT_MS);
        if (!response.ok) {
            await logPaymentEvent("telegram_payment_notification_failed", data.paymentId ?? null, {
                notificationType: type,
                reason: "telegram_api_http_error",
                httpStatus: response.status,
                transport: response.transport,
                telegramErrorCode: response.telegramError?.errorCode,
                telegramDescription: response.telegramError?.description,
            });
        } else {
            await logPaymentEvent("telegram_payment_notification_sent", data.paymentId ?? null, {
                notificationType: type,
                httpStatus: response.status,
                transport: response.transport,
            });
        }
        return { sent: response.ok, status: response.status, transport: response.transport };
    } catch (error) {
        const details = getTelegramSafeErrorDetails(error);
        await logPaymentEvent("telegram_payment_notification_failed", data.paymentId ?? null, {
            notificationType: type,
            ...details,
        });
        return { sent: false };
    }
}
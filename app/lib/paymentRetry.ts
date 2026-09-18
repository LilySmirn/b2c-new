export const PAYMENT_RETRY_DELAY_SECONDS = 30;

export function getRetryAllowedAt(createdAt: Date | string): Date {
    const value = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
    return new Date(value + PAYMENT_RETRY_DELAY_SECONDS * 1_000);
}

export function isPaymentRetryBlocked(createdAt: Date | string, now = new Date()): boolean {
    return getRetryAllowedAt(createdAt).getTime() > now.getTime();
}
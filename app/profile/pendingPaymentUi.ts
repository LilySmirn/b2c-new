export const PENDING_COUNTDOWN_MS = 30_000;
export const PENDING_RETRY_LINK_MS = 60_000;

export type PendingPaymentUiLifecycle = {
    paymentId: string;
    startedAtMs: number;
};

export type PendingPaymentUiView =
    | { phase: "countdown"; secondsRemaining: number }
    | { phase: "retry" }
    | { phase: "hidden" };

/**
 * Starts a visual lifecycle only when the displayed payment changes. In
 * particular, a fresh object returned by polling for the same payment cannot
 * restart an expired lifecycle.
 */
export function observePendingPayment(
    lifecycle: PendingPaymentUiLifecycle | null,
    paymentId: string,
    nowMs: number,
): PendingPaymentUiLifecycle {
    if (lifecycle?.paymentId === paymentId) {
        return lifecycle;
    }

    return { paymentId, startedAtMs: nowMs };
}

export function getPendingPaymentUiView(
    lifecycle: PendingPaymentUiLifecycle,
    nowMs: number,
): PendingPaymentUiView {
    const elapsedMs = Math.max(0, nowMs - lifecycle.startedAtMs);

    if (elapsedMs < PENDING_COUNTDOWN_MS) {
        return {
            phase: "countdown",
            secondsRemaining: Math.ceil((PENDING_COUNTDOWN_MS - elapsedMs) / 1_000),
        };
    }

    if (elapsedMs < PENDING_COUNTDOWN_MS + PENDING_RETRY_LINK_MS) {
        return { phase: "retry" };
    }

    return { phase: "hidden" };
}
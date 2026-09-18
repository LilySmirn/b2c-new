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

type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getPendingNoticeStorageKey(paymentId: string): string {
    return `pendingNotice:${paymentId}`;
}

/**
 * Returns the first time this payment's notice was observed in this browser
 * session. React remounts, status polling, and navigation back from YooKassa
 * all reuse the same value rather than extending the notice's lifetime.
 */
export function getOrCreatePendingPaymentUiLifecycle(
    storage: SessionStorage,
    paymentId: string,
    nowMs: number,
): PendingPaymentUiLifecycle {
    const key = getPendingNoticeStorageKey(paymentId);
    const storedStartedAt = storage.getItem(key);

    if (storedStartedAt !== null) {
        const parsedStartedAt = Number(storedStartedAt);
        return {
            paymentId,
            startedAtMs: Number.isFinite(parsedStartedAt) ? parsedStartedAt : nowMs,
        };
    }

    storage.setItem(key, String(nowMs));
    return { paymentId, startedAtMs: nowMs };
}

export function clearPendingPaymentUiLifecycle(storage: SessionStorage, paymentId: string): void {
    storage.removeItem(getPendingNoticeStorageKey(paymentId));
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
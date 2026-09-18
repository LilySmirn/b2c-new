"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";
import {
    clearPendingPaymentUiLifecycle,
    getPendingPaymentUiView,
    getOrCreatePendingPaymentUiLifecycle,
    type PendingPaymentUiLifecycle,
} from "./pendingPaymentUi";

type PaymentState =
    | { state: "normal" }
    | { state: "creating"; paymentId: string; tariffName: string }
    | { state: "pending"; paymentId: string; tariffName: string; confirmationUrl: string | null }
    | { state: "succeeded"; paymentId: string; tariffName: string }
    | { state: "canceled"; paymentId: string; tariffName: string; cancellationReason: string | null };

type PaymentStatus = {
    paymentId: string;
    status: "creating" | "pending" | "succeeded" | "canceled";
    tariffId: string;
    tariffName: string;
    cancellationReason?: string | null;
};

const FAST_POLLING_DURATION_MS = 30_000;
const FAST_POLLING_INTERVAL_MS = 2_000;
const SLOW_POLLING_INTERVAL_MS = 5_000;
const MAX_POLLING_DURATION_MS = 15 * 60_000;

function getCancellationMessage(reason: string | null): string {
    if (reason === "insufficient_funds") {
        return "Недостаточно средств на карте.";
    }

    return "Не удалось выполнить оплату.";
}

export default function PaymentStateNotice() {
    const router = useRouter();
    const [payment, setPayment] = useState<PaymentState>({ state: "normal" });
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [pendingUi, setPendingUi] = useState<PendingPaymentUiLifecycle | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const stored = sessionStorage.getItem("currentPayment");
        if (stored) {
            try {
                const candidate = JSON.parse(stored) as { paymentId?: unknown; tariffName?: unknown };
                if (typeof candidate.paymentId === "string" && typeof candidate.tariffName === "string") {
                    setPayment({ state: "creating", paymentId: candidate.paymentId, tariffName: candidate.tariffName });
                }
            } catch {
                sessionStorage.removeItem("currentPayment");
            }
        }

        fetch("/api/payments/current", { signal: controller.signal })
            .then((response) => response.ok ? response.json() : { state: "normal" })
            .then((currentPayment: PaymentState) => setPayment(currentPayment))
            .catch((error: unknown) => {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    setPayment({ state: "normal" });
                }
            });

        return () => controller.abort();
    }, []);

    useEffect(() => {
        const handleCreated = (event: Event) => {
            const payment = (event as CustomEvent<{ paymentId: string; tariffName: string }>).detail;
            // The authoritative server projection supplies the persisted retry
            // deadline; a client event must never start a fresh 30-second lock.
            fetch("/api/payments/current")
                .then((response) => response.ok ? response.json() : { state: "normal" })
                .then((currentPayment: PaymentState) => setPayment(currentPayment));
        };

        window.addEventListener("payment-created", handleCreated);
        return () => window.removeEventListener("payment-created", handleCreated);
    }, []);

    const pendingPaymentId = payment.state === "pending" ? payment.paymentId : null;

    useEffect(() => {
        if (!pendingPaymentId) return;

        const observedAt = Date.now();
        setNowMs(observedAt);
        setPendingUi(getOrCreatePendingPaymentUiLifecycle(sessionStorage, pendingPaymentId, observedAt));
    }, [pendingPaymentId]);

    useEffect(() => {
        if (!pendingPaymentId || pendingUi?.paymentId !== pendingPaymentId) return;

        const interval = window.setInterval(() => {
            const currentTime = Date.now();
            setNowMs(currentTime);
            if (getPendingPaymentUiView(pendingUi, currentTime).phase === "hidden") {
                window.clearInterval(interval);
            }
        }, 250);
        return () => window.clearInterval(interval);
    }, [pendingPaymentId, pendingUi?.paymentId]);

    useEffect(() => {
        if (payment.state === "succeeded" || payment.state === "canceled") {
            clearPendingPaymentUiLifecycle(sessionStorage, payment.paymentId);
        }
    }, [payment]);

    useEffect(() => {
        if (payment.state !== "pending" && payment.state !== "creating") {
            return;
        }

        const paymentId = payment.paymentId;
        const startedAt = Date.now();
        const controller = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;

        const stop = () => {
            stopped = true;
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
            }
            controller.abort();
        };

        const scheduleNext = () => {
            if (stopped) return;

            const elapsed = Date.now() - startedAt;
            if (elapsed >= MAX_POLLING_DURATION_MS) {
                stop();
                return;
            }

            const interval = elapsed < FAST_POLLING_DURATION_MS
                ? FAST_POLLING_INTERVAL_MS
                : SLOW_POLLING_INTERVAL_MS;
            timeoutId = setTimeout(poll, interval);
        };

        const poll = async () => {
            if (stopped) return;

            try {
                const response = await fetch(
                    `/api/payments/${encodeURIComponent(paymentId)}/status`,
                    { signal: controller.signal },
                );

                if (response.status === 401 || response.status === 404) {
                    stop();
                    return;
                }

                if (!response.ok) {
                    scheduleNext();
                    return;
                }

                const status = await response.json() as PaymentStatus;
                if (status.status === "pending" && payment.state === "creating") {
                    const currentResponse = await fetch("/api/payments/current", { signal: controller.signal });
                    if (currentResponse.ok) setPayment(await currentResponse.json() as PaymentState);
                    scheduleNext();
                    return;
                }
                if (status.status === "succeeded") {
                    sessionStorage.removeItem("currentPayment");
                    clearPendingPaymentUiLifecycle(sessionStorage, paymentId);
                    setPayment({ state: "succeeded", paymentId, tariffName: status.tariffName });
                    // Re-render server components from the subscription in DB;
                    // the payment response itself is never used as tariff state.
                    router.refresh();
                    stop();
                    return;
                }

                if (status.status === "canceled") {
                    sessionStorage.removeItem("currentPayment");
                    clearPendingPaymentUiLifecycle(sessionStorage, paymentId);
                    setPayment({
                        state: "canceled",
                        paymentId,
                        tariffName: status.tariffName,
                        cancellationReason: status.cancellationReason ?? null,
                    });
                    stop();
                    return;
                }
            } catch (error: unknown) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
            }

            scheduleNext();
        };

        scheduleNext();
        return stop;
    }, [payment.state === "pending" || payment.state === "creating" ? payment.paymentId : null, router]);

    if (payment.state === "normal" || payment.state === "creating") {
        return null;
    }

    if (payment.state === "pending") {
        // sessionStorage keeps this visual deadline stable across refreshes and
        // round trips to YooKassa, independently of the server retry deadline.
        if (!pendingUi || pendingUi.paymentId !== payment.paymentId) return null;

        const pendingView = getPendingPaymentUiView(pendingUi, nowMs);
        if (pendingView.phase === "hidden") return null;
        return (
            <div className={`${styles.paymentNotice} ${styles.paymentNoticePending}`} role="status">
                <strong>Проверяем результат платежа</strong>
                <span>
                    ЮKassa ещё не сообщила окончательный статус. Если оплата прошла, срок подписки обновится автоматически. Если оплата не завершена, вы {pendingView.phase === "countdown" ? (
                        <>сможете оплатить повторно через <strong>{pendingView.secondsRemaining} секунд</strong></>
                    ) : payment.confirmationUrl ? (
                        <>можете <a href={payment.confirmationUrl}>оплатить</a> повторно</>
                    ) : (
                        <>можете оплатить повторно</>
                    )}. Или дождаться автоматического закрытия сообщения.
                </span>
            </div>
        );
    }

    if (payment.state === "succeeded") {
        return (
            <div className={`${styles.paymentNotice} ${styles.paymentNoticeSucceeded}`} role="status">
                Вы успешно купили тариф „{payment.tariffName}“
            </div>
        );
    }

    return (
        <div className={`${styles.paymentNotice} ${styles.paymentNoticeCanceled}`} role="alert">
            <span>{getCancellationMessage(payment.cancellationReason)}</span>
        </div>
    );
}
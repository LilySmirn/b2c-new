"use client";

import { useEffect, useState } from "react";
import styles from "./profile.module.css";

type PaymentState =
    | { state: "normal" }
    | { state: "pending"; paymentId: string; tariffName: string }
    | { state: "canceled"; tariffName: string; cancellationReason: string | null };

type PaymentStatus = {
    paymentId: string;
    status: "pending" | "succeeded" | "canceled";
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
    const [payment, setPayment] = useState<PaymentState>({ state: "normal" });

    useEffect(() => {
        const controller = new AbortController();

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
            setPayment({
                state: "pending",
                paymentId: payment.paymentId,
                tariffName: payment.tariffName,
            });
        };

        window.addEventListener("payment-created", handleCreated);
        return () => window.removeEventListener("payment-created", handleCreated);
    }, []);

    useEffect(() => {
        if (payment.state !== "pending") {
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
                if (status.status === "succeeded") {
                    setPayment({ state: "normal" });
                    stop();
                    return;
                }

                if (status.status === "canceled") {
                    setPayment({
                        state: "canceled",
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
    }, [payment.state === "pending" ? payment.paymentId : null]);

    if (payment.state === "normal") {
        return null;
    }

    if (payment.state === "pending") {
        return (
            <div className={`${styles.paymentNotice} ${styles.paymentNoticePending}`} role="status">
                Платёж тарифа «{payment.tariffName}» обрабатывается
            </div>
        );
    }

    return (
        <div className={`${styles.paymentNotice} ${styles.paymentNoticeCanceled}`} role="alert">
            <strong>Не удалось оплатить тариф «{payment.tariffName}».</strong>
            <span>{getCancellationMessage(payment.cancellationReason)}</span>
        </div>
    );
}
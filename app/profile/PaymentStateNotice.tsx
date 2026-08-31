"use client";

import { useEffect, useState } from "react";
import styles from "./profile.module.css";

type PaymentState =
    | { state: "normal" }
    | { state: "pending"; tariffName: string }
    | { state: "canceled"; tariffName: string; cancellationReason: string | null };

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
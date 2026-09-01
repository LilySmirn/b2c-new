"use client";

import { useState } from "react";
import styles from "./TariffModal.module.css";

interface Tariff {
    id: string;
    title: string;
    duration: string;
    price: number;
}

const tariffs: Tariff[] = [
    { id: "1", title: "Базовый", duration: "1 месяц", price: 100 },
    { id: "2", title: "Оптимальный", duration: "3 месяца", price: 750 },
    { id: "3", title: "Расширенный", duration: "6 месяцев", price: 1200 },
    { id: "4", title: "Премиум", duration: "12 месяцев", price: 1800 }
];

interface TariffModalProps {
    triggerText?: string;
    triggerClassName?: string;
}

export default function TariffModal({
    triggerText = "Продлить тариф",
    triggerClassName = styles.tariffLink,
}: TariffModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTariff, setSelectedTariff] = useState<string>(tariffs[0].id);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleBuy = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const response = await fetch("/api/payments/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tariffId: selectedTariff }),
            });
            const result = await response.json();

            if (response.status === 409 && result.code === "PAYMENT_ALREADY_PENDING") {
                setErrorMessage(
                    `Дождитесь окончания оплаты тарифа «${result.payment.tariffName}».\n` +
                    "После этого можно совершить новую оплату.",
                );
                return;
            }

            if (!response.ok) {
                setErrorMessage(result.error ?? "Не удалось создать платёж. Попробуйте ещё раз.");
                return;
            }

            window.dispatchEvent(new CustomEvent("payment-created", { detail: result }));
            setIsOpen(false);
        } catch {
            setErrorMessage("Не удалось создать платёж. Проверьте соединение и попробуйте ещё раз.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <button
            type="button"
                onClick={() => {
                    setErrorMessage(null);
                    setIsOpen(true);
                }}
                className={triggerClassName}
            >
                {triggerText}
            </button>

            {isOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tariff-modal-title"
                    >
                        <button
                            type="button"
                            className={styles.modalPopupClose}
                            onClick={() => setIsOpen(false)}
                            aria-label="Закрыть окно выбора тарифа"
                        >
                            ×
                        </button>

                        <div className={styles.modalHeader}>
                            <h2 id="tariff-modal-title">Выберите тариф</h2>
                            <p className={styles.modalDescription}>
                                Срок действия тарифа будет добавлен к текущей подписке после оплаты.
                            </p>
                        </div>
                        
                        <div className={styles.tariffList}>
                            <div className={styles.tariffHeader} aria-hidden="true">
                                <span />
                                <span>Название тарифа</span>
                                <span>Срок</span>
                                <span>Цена</span>
                            </div>
                            {tariffs.map(tariff => (
                                <label key={tariff.id} className={styles.tariffOption}>
                                    <input
                                        type="radio"
                                        name="tariff"
                                        value={tariff.id}
                                        checked={selectedTariff === tariff.id}
                                        onChange={() => setSelectedTariff(tariff.id)}
                                    />
                                    <span className={styles.tariffName}>{tariff.title}</span>
                                    <span className={styles.tariffMeta}>{tariff.duration}</span>
                                    <span className={styles.tariffPrice}>{tariff.price.toLocaleString("ru-RU")} ₽</span>
                                </label>
                            ))}
                        </div>

                        <div className={styles.buttons}>
                            <button onClick={() => setIsOpen(false)} className={styles.cancelBtn}>
                                Отмена
                            </button>
                            <button onClick={handleBuy} className={styles.buyBtn} disabled={isSubmitting}>
                                {isSubmitting ? "Создаём платёж…" : "Купить"}
                            </button>
                        </div>

                        {errorMessage && (
                            <div className={styles.paymentError} role="alert">
                                {errorMessage}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}

"use client";

import { useState } from "react";
import styles from "./TariffModal.module.css";
import { useRouter } from "next/navigation";

interface Tariff {
    id: string;
    title: string;
    duration: string;
    price: number;
    paymentUrl: string;
}

const tariffs: Tariff[] = [
    { id: "basic", title: "Базовый", duration: "1 месяц", price: 300, paymentUrl: "/pay/basic" },
    { id: "optimal", title: "Оптимальный", duration: "3 месяца", price: 750, paymentUrl: "/pay/optimal" },
    { id: "extended", title: "Расширенный", duration: "6 месяцев", price: 1200, paymentUrl: "/pay/extended" },
    { id: "pro", title: "Премиум", duration: "12 месяцев", price: 1800, paymentUrl: "/pay/pro" }
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
    const router = useRouter();

    const handleBuy = () => {
        const tariff = tariffs.find(t => t.id === selectedTariff);
        if (tariff) {
            router.push(tariff.paymentUrl);
        }
    };

    return (
        <>
            <button
            type="button"
                onClick={() => setIsOpen(true)}
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
                            <button onClick={handleBuy} className={styles.buyBtn}>
                                Купить
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

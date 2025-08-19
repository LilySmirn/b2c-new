"use client";

import { useState } from "react";
import styles from "./TariffModal.module.css";
import { useRouter } from "next/navigation";

interface Tariff {
    id: string;
    title: string;
    price: number;
    paymentUrl: string;
}

const tariffs: Tariff[] = [
    { id: "basic", title: "Базовый", price: 300, paymentUrl: "/pay/basic" },
    { id: "optimal", title: "Оптимальный", price: 750, paymentUrl: "/pay/optimal" },
    { id: "extended", title: "Расширенный", price: 1200, paymentUrl: "/pay/extended" },
    { id: "pro", title: "Профи", price: 1800, paymentUrl: "/pay/pro" }
];

export default function TariffModal() {
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
                onClick={() => setIsOpen(true)}
                className={styles.tariffLink}
            >
                Продлить тариф
            </button>

            {isOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={styles.modalPopupClose}
                            onClick={() => setIsOpen(false)}
                        >
                            <img src="/images/popup-exit.png" alt="close"/>
                        </div>
                        <h2>Выберите тариф</h2>
                        <div className={styles.tariffList}>
                            {tariffs.map(tariff => (
                                <label key={tariff.id} className={styles.tariffOption}>
                                    <input
                                        type="radio"
                                        name="tariff"
                                        value={tariff.id}
                                        checked={selectedTariff === tariff.id}
                                        onChange={() => setSelectedTariff(tariff.id)}
                                    />
                                    {tariff.title} — {tariff.price} ₽
                                </label>
                            ))}
                        </div>

                        <div className={styles.buttons}>
                            <button onClick={handleBuy} className={styles.buyBtn}>
                                Купить
                            </button>
                            <button onClick={() => setIsOpen(false)} className={styles.cancelBtn}>
                                Отмена
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

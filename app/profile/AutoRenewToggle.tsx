'use client';

import { useState } from "react";
import modalStyles from "./TariffModal.module.css";
import styles from './profile.module.css';

import { Subscription } from "@/app/types/Subscription";

export default function AutoRenewToggle({
                                            userId,
                                            subscriptionId,
                                            subscriptionRenewalStatus,
                                        }: {
    userId: string;
    subscriptionId: string | null;
    subscriptionRenewalStatus: boolean;
}) {
    const [subscriptionStatus, setStatus] = useState<boolean>(subscriptionRenewalStatus);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const fetchStatus = async () => {
        const res = await fetch(`/api/subscriptions?userId=${userId}`);
        const subscriptions: Subscription[] = await res.json();
        const lastSubscription = subscriptions?.reduce((latest, current) => {
            return new Date(current.expiration_date) > new Date(latest.expiration_date)
                ? current
                : latest;
        }, subscriptions[0]);
        setStatus(lastSubscription.is_auto_renewal);
    };

    const handleToggleClick = () => {
        if (subscriptionId === null) return;
        setIsConfirmOpen(true);
    };

    const handleConfirm = async () => {
        await fetch('/api/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ state: !subscriptionStatus, id: subscriptionId }),
            headers: { 'Content-Type': 'application/json' },
        });
        await fetchStatus();
        setIsConfirmOpen(false);
    };

    const handleCancel = () => {
        setIsConfirmOpen(false);
    };

    return (
        <>
            <label className={styles.switch}>
                <input
                    className={styles.switchInput}
                    type="checkbox"
                    disabled={subscriptionId === null}
                    checked={subscriptionStatus}
                    onChange={handleToggleClick}
                />
                <span className={styles.slider}></span>
            </label>

            {isConfirmOpen && (
                <div
                    className={modalStyles.modalOverlay}
                    onClick={handleCancel}
                >
                    <div
                        className={modalStyles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={modalStyles.modalPopupClose}
                            onClick={handleCancel}
                        >
                            <img src="/images/popup-exit.png" alt="close"/>
                        </div>
                        <h2>Подтверждение</h2>
                        <p className={modalStyles.modalText}>
                            Вы уверены, что хотите {subscriptionStatus ? 'отключить' : 'включить'} автопродление?
                        </p>
                        <div className={modalStyles.buttons}>
                            <button onClick={handleConfirm} className={modalStyles.buyBtn}>
                                Да
                            </button>
                            <button onClick={handleCancel} className={modalStyles.cancelBtn}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

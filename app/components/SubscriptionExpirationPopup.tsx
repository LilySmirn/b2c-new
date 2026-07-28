"use client";

import { useEffect, useState } from "react";
import { getDaysWord, type SubscriptionReminder } from "../lib/subscriptionReminder";
import styles from "./SubscriptionExpirationPopup.module.css";

const POPUP_FLAG = "showSubscriptionExpirationPopup";

export default function SubscriptionExpirationPopup({ reminder }: { reminder: SubscriptionReminder | null }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const shouldShow = window.sessionStorage.getItem(POPUP_FLAG) === "true";
        window.sessionStorage.removeItem(POPUP_FLAG);

        if (reminder && shouldShow) {
            setIsOpen(true);
        }
    }, [reminder]);

    if (!isOpen || !reminder) return null;

    return (
        <div className={styles.overlay} role="presentation" onMouseDown={() => setIsOpen(false)}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="subscription-reminder-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <button className={styles.close} type="button" aria-label="Закрыть" onClick={() => setIsOpen(false)}>×</button>
                <div className={styles.icon} aria-hidden="true">!</div>
                <h2 id="subscription-reminder-title">Подписка скоро закончится</h2>
                <p>
                    До окончания подписки осталось {reminder.daysLeft} {getDaysWord(reminder.daysLeft)}.
                    Продлите её заранее, чтобы сохранить доступ ко всем возможностям EasyMed.
                </p>
                <a className={styles.payLink} href="#">Продлить подписку</a>
            </section>
        </div>
    );
}
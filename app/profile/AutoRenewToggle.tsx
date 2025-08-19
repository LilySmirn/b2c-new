'use client';

import styles from './profile.module.css';
import { useState } from "react";
import { Subscription } from "@/app/types/Subscription";

export default function AutoRenewToggle({
        userId,
        tariffId,
        subscriptionRenewalStatus,
    }: {
        userId: string;
        tariffId: string | null;
        subscriptionRenewalStatus: boolean;
    }) {
    const [subscriptionStatus, setStatus] = useState<boolean>(subscriptionRenewalStatus);

    const fetchStatus = async () => {
        const res = await fetch(`/api/subscriptions?userId=${userId}`);
        const subscriptions:Subscription[] = await res.json();

        const lastSubscription = subscriptions?.reduce((latest, current) => {
            return new Date(current.expiration_date) > new Date(latest.expiration_date)
                ? current
                : latest;
        }, subscriptions[0]);

        setStatus(lastSubscription.is_auto_renewal);
    };

    const handleChange = async () => {
        await fetch('/api/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ state: !subscriptionStatus, userId, tariffId }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        await fetchStatus();
    };

    return (
        <label className={styles.switch}>
            <input
                className={styles.switchInput}
                type="checkbox"
                disabled={tariffId === null}
                checked={subscriptionStatus}
                onChange={handleChange}
            />
            <span className={styles.slider}></span>
        </label>
    );
}

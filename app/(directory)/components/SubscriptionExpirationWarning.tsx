"use client";

import { useEffect, useState } from "react";
import { getDaysWord, type SubscriptionReminder } from "../../lib/subscriptionReminder";
import styles from "./DirectoryPageHeader.module.css";

export default function SubscriptionExpirationWarning() {
  const [reminder, setReminder] = useState<SubscriptionReminder | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/subscription-reminder", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ reminder: SubscriptionReminder | null }> : null)
      .then((data) => setReminder(data?.reminder ?? null))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setReminder(null);
      });

    return () => controller.abort();
  }, []);

  if (!reminder) return null;

  return (
    <p className={styles.subscriptionWarning} role="status">
      До окончания подписки осталось {reminder.daysLeft} {getDaysWord(reminder.daysLeft)}.{' '}
      <a href="#">Оплатите</a>
    </p>
  );
}
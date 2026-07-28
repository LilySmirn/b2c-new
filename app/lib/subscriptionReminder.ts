export type SubscriptionReminder = {
    subscriptionId: string;
    expirationDate: string;
    daysLeft: number;
    tariffTitle: string | null;
};

export function getDaysUntilExpiration(expirationDate: Date, now = new Date()): number {
    return Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / 86_400_000));
}

export function getDaysWord(days: number): string {
    const lastTwoDigits = days % 100;
    const lastDigit = days % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "дней";
    if (lastDigit === 1) return "день";
    if (lastDigit >= 2 && lastDigit <= 4) return "дня";
    return "дней";
}
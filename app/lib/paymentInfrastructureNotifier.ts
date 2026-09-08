/** Adapter point for a future administrator notification integration. */
export async function notifyPaymentInfrastructureFailure(_details: {
    paymentId: string;
    userId: string;
    tariffId: string;
    category: string;
}): Promise<void> {
    // JSONL is the only notification channel in Stage 6B.
}
const TIMEOUT_MS = 10_000;

export type ProviderPayment = {
    id: string; status: string;
    amount?: { value?: string; currency?: string };
    metadata?: { order_id?: unknown };
    cancellation_details?: { reason?: string };
};

export type ProviderStatusResult =
    | { outcome: "ok"; payment: ProviderPayment }
    | { outcome: "error"; category: string; httpStatus?: number };

export async function getYookassaPayment(id: string, fetchImpl: typeof fetch = fetch): Promise<ProviderStatusResult> {
    const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
    const secret = process.env.YOOKASSA_SECRET_KEY?.trim();
    if (!shopId || !secret) return { outcome: "error", category: "configuration_missing" };
    try {
        const response = await fetchImpl(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Basic ${Buffer.from(`${shopId}:${secret}`).toString("base64")}` },
            cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) return { outcome: "error", category: response.status === 404 ? "not_found" : response.status === 401 || response.status === 403 ? "credentials" : "provider_http_error", httpStatus: response.status };
        const payment = await response.json() as ProviderPayment;
        return { outcome: "ok", payment };
    } catch (error) {
        return { outcome: "error", category: error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError") ? "timeout" : "network_error" };
    }
}

export function rublesToKopecks(value: string): bigint | null {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
    const [rubles, kopecks = ""] = value.split(".");
    return BigInt(rubles) * BigInt(100) + BigInt(kopecks.padEnd(2, "0"));
}

export function paymentIntegrityError(local: { yookassaPaymentId: string; amount: string; orderNumber: string | null }, provider: ProviderPayment): string | null {
    if (provider.id !== local.yookassaPaymentId) return "payment_id_mismatch";
    if (provider.amount?.currency !== "RUB") return "currency_mismatch";
    const localAmount = rublesToKopecks(local.amount);
    const providerAmount = rublesToKopecks(provider.amount?.value ?? "");
    if (localAmount === null || providerAmount === null || localAmount !== providerAmount) return "amount_mismatch";
    if (provider.metadata?.order_id != null && local.orderNumber != null && String(provider.metadata.order_id) !== String(local.orderNumber)) return "order_id_mismatch";
    return null;
}

export function finalStatusToProcess(status: string): "succeeded" | "canceled" | null {
    return status === "succeeded" || status === "canceled" ? status : null;
}
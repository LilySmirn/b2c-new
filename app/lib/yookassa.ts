import "server-only";

const requestTimeoutMs = 4_000;
type Fetch = typeof fetch;

export type YooKassaPayment = { id: string; status: "pending"; confirmationUrl: string };
export type YooKassaErrorDetails = {
    httpStatus: number;
    code?: string;
    description?: string;
    parameter?: string;
    type?: string;
};

export class PaymentProviderError extends Error {
    constructor(
        public readonly reason: string,
        public readonly definitelyNotCreated: boolean,
        public readonly providerPaymentId: string | null = null,
        public readonly details: YooKassaErrorDetails | null = null,
    ) {
        super(reason);
        this.name = "PaymentProviderError";
    }
}

function optionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

async function readYooKassaError(response: Response): Promise<YooKassaErrorDetails> {
    const details: YooKassaErrorDetails = { httpStatus: response.status };
    try {
        const body = await response.json() as Record<string, unknown>;
        details.code = optionalString(body.code);
        details.description = optionalString(body.description);
        details.parameter = optionalString(body.parameter);
        details.type = optionalString(body.type);
    } catch {
        // An HTTP status is still useful when an upstream proxy returns non-JSON.
    }
    return details;
}

function requiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new PaymentProviderError(`missing_${name.toLowerCase()}`, true);
    return value;
}

async function timedFetch(fetchImplementation: Fetch, url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetchImplementation(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) });
    } catch (error) {
        const reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error";
        throw new PaymentProviderError(reason, false);
    }
}

export async function checkWebhookHealth(fetchImplementation: Fetch = fetch): Promise<void> {
    const serviceUrl = requiredEnv("YOOKASSA_WEBHOOK_SERVICE_URL");
    const secret = requiredEnv("WEBHOOK_HEALTH_SECRET");
    let healthUrl: URL;
    try {
        healthUrl = new URL("/health", serviceUrl);
    } catch {
        throw new PaymentProviderError("invalid_webhook_service_url", true);
    }
    const response = await timedFetch(fetchImplementation, healthUrl.toString(), {
        method: "GET", headers: { Authorization: `Bearer ${secret}` }, cache: "no-store",
    });
    if (response.status !== 200) throw new PaymentProviderError(`health_http_${response.status}`, true);
}

export async function createYooKassaPayment(
    input: { amount: number; idempotencyKey: string },
    fetchImplementation: Fetch = fetch,
): Promise<YooKassaPayment> {
    const shopId = requiredEnv("YOOKASSA_SHOP_ID");
    const secretKey = requiredEnv("YOOKASSA_SECRET_KEY");
    const appUrl = requiredEnv("NEXT_PUBLIC_APP_URL");
    let returnUrl: string;
    try {
        returnUrl = new URL("/profile", appUrl).toString();
    } catch {
        throw new PaymentProviderError("invalid_app_url", true);
    }
    const response = await timedFetch(fetchImplementation, "https://api.yookassa.ru/v3/payments", {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`,
            "Content-Type": "application/json",
            "Idempotence-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
            amount: { value: input.amount.toFixed(2), currency: "RUB" }, capture: true,
            confirmation: { type: "redirect", return_url: returnUrl },
        }),
        cache: "no-store",
    });
    if (!response.ok) {
        const details = await readYooKassaError(response);
        throw new PaymentProviderError(
            `http_${response.status}`,
            response.status >= 400 && response.status < 500,
            null,
            details,
        );
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new PaymentProviderError("invalid_json", false); }
    const payment = body as { id?: unknown; status?: unknown; confirmation?: { confirmation_url?: unknown } };
    const providerPaymentId = typeof payment.id === "string" && payment.id ? payment.id : null;
    if (!providerPaymentId) throw new PaymentProviderError("missing_payment_id", false);
    if (payment.status !== "pending") throw new PaymentProviderError("unexpected_status", false, providerPaymentId);
    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (typeof confirmationUrl !== "string" || !confirmationUrl) {
        throw new PaymentProviderError("missing_confirmation_url", false, providerPaymentId);
    }
    return { id: providerPaymentId, status: "pending", confirmationUrl };
}
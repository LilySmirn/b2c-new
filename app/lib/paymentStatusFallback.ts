import {
    claimPaymentProviderStatusCheck,
    getOwnedProviderPaymentContext,
    type PaymentStatus,
    type ProviderPaymentContext,
} from "@/app/lib/db";
import { processAuthoritativePayment } from "@/app/lib/authoritativePaymentProcessor";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";

export const PAYMENT_STATUS_CHECK_COOLDOWN_SECONDS = 10;

type FallbackDependencies = {
    getOwnedContext: (userId: string, paymentId: string) => Promise<ProviderPaymentContext | null>;
    claimCheck: (userId: string, paymentId: string, cooldownSeconds: number) => Promise<boolean>;
    process: typeof processAuthoritativePayment;
    log: typeof logPaymentEvent;
};

const defaultDependencies: FallbackDependencies = {
    getOwnedContext: getOwnedProviderPaymentContext,
    claimCheck: claimPaymentProviderStatusCheck,
    process: processAuthoritativePayment,
    log: logPaymentEvent,
};

/** Runs a best-effort reconciliation after ownership has been established locally. */
export async function reconcilePaymentStatusFallback(
    userId: string,
    payment: PaymentStatus,
    dependencies: FallbackDependencies = defaultDependencies,
): Promise<void> {
    if (payment.status !== "creating" && payment.status !== "pending") return;

    const local = await dependencies.getOwnedContext(userId, payment.paymentId);
    if (!local) return;

    const claimed = await dependencies.claimCheck(
        userId,
        payment.paymentId,
        PAYMENT_STATUS_CHECK_COOLDOWN_SECONDS,
    );
    if (!claimed) {
        await dependencies.log("yookassa_fallback_check_skipped_cooldown", payment.paymentId, {
            yookassaPaymentId: local.yookassaPaymentId,
            userId,
            cooldownSeconds: PAYMENT_STATUS_CHECK_COOLDOWN_SECONDS,
        });
        return;
    }

    try {
        await dependencies.process(local, "fallback");
    } catch (error) {
        // Reconciliation is best effort: a provider/processing outage must not be
        // presented to the browser as a declined card.
        await dependencies.log("yookassa_fallback_check_failed", payment.paymentId, {
            yookassaPaymentId: local.yookassaPaymentId,
            userId,
            errorCategory: "processing_exception",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
    }
}
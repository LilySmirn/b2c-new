import db, { getLatestSubscriptionExpiration, type ProviderPaymentContext } from "@/app/lib/db";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { processPaymentStatus, type ProcessPaymentStatusResult } from "@/app/lib/processPaymentStatus";
import { sendPaymentTelegramNotification } from "@/app/lib/paymentTelegramNotifier";
import {
    finalStatusToProcess,
    getYookassaPayment,
    paymentIntegrityError,
    type ProviderStatusResult,
} from "@/app/lib/yookassaStatusClient";

export type PaymentStatusCheckSource = "webhook" | "fallback";

export type AuthoritativePaymentResult =
    | { outcome: "checked"; providerStatus: string; finalStatus: boolean; payment: ProcessPaymentStatusResult | null }
    | { outcome: "provider_error"; category: string; httpStatus?: number }
    | { outcome: "integrity_error"; category: string; providerStatus: string };

type Dependencies = {
    getProviderPayment: (id: string) => Promise<ProviderStatusResult>;
    processStatus: typeof processPaymentStatus;
    markPending: (paymentId: string) => Promise<void>;
    getSubscriptionExpiration: (userId: string) => Promise<Date | string | null>;
    notify: typeof sendPaymentTelegramNotification;
    log: typeof logPaymentEvent;
};

const defaultDependencies: Dependencies = {
    getProviderPayment: getYookassaPayment,
    processStatus: processPaymentStatus,
    markPending: (paymentId) => new db().markPaymentPending(paymentId),
    getSubscriptionExpiration: getLatestSubscriptionExpiration,
    notify: sendPaymentTelegramNotification,
    log: logPaymentEvent,
};

function eventName(source: PaymentStatusCheckSource, fallbackName: string, webhookName: string): string {
    return source === "fallback" ? fallbackName : webhookName;
}

/**
 * Applies a server-authoritative provider result through the one existing finalization path.
 * Callers are responsible only for authentication/ownership and (for fallback) cooldown claiming.
 */
export async function processAuthoritativePayment(
    local: ProviderPaymentContext,
    source: PaymentStatusCheckSource,
    dependencies: Dependencies = defaultDependencies,
): Promise<AuthoritativePaymentResult> {
    const context = {
        paymentId: local.paymentId,
        yookassaPaymentId: local.yookassaPaymentId,
        userId: local.userId,
        tariffId: local.tariffId,
        orderNumber: local.orderNumber,
        source,
    };
    await dependencies.log(
        eventName(source, "yookassa_fallback_check_started", "yookassa_status_check_started"),
        local.paymentId,
        context,
    );

    const checked = await dependencies.getProviderPayment(local.yookassaPaymentId);
    if (checked.outcome === "error") {
        await dependencies.log(
            eventName(source, "yookassa_fallback_check_failed", "yookassa_status_check_failed"),
            local.paymentId,
            { ...context, errorCategory: checked.category, httpStatus: checked.httpStatus },
        );
        return { outcome: "provider_error", category: checked.category, httpStatus: checked.httpStatus };
    }

    const providerStatus = checked.payment.status;
    await dependencies.log(
        eventName(source, "yookassa_fallback_status_received", "yookassa_status_check_succeeded"),
        local.paymentId,
        { ...context, providerStatus },
    );

    const mismatch = paymentIntegrityError(local, checked.payment);
    if (mismatch) {
        await dependencies.log("yookassa_payment_integrity_failed", local.paymentId, {
            ...context,
            providerStatus,
            errorCategory: mismatch,
        });
        if (source === "fallback") {
            await dependencies.log("yookassa_fallback_check_failed", local.paymentId, {
                ...context,
                providerStatus,
                errorCategory: mismatch,
            });
        }
        return { outcome: "integrity_error", category: mismatch, providerStatus };
    }

    const finalStatus = finalStatusToProcess(providerStatus);
    if (!finalStatus) {
        return { outcome: "checked", providerStatus, finalStatus: false, payment: null };
    }

    // Preserve the existing rule that a locally rejected checkout cannot later grant access.
    if (finalStatus === "succeeded" && (local.status === "canceled" || local.status === "error")) {
        return { outcome: "checked", providerStatus, finalStatus: false, payment: null };
    }
    if (finalStatus === "succeeded") {
        await dependencies.markPending(local.paymentId);
    }

    const payment = await dependencies.processStatus({
        paymentId: local.paymentId,
        status: finalStatus,
        cancellationReason: checked.payment.cancellation_details?.reason ?? null,
        cancellationParty: checked.payment.cancellation_details?.party ?? null,
    });
    if (!payment) {
        return { outcome: "checked", providerStatus, finalStatus: true, payment: null };
    }

    await dependencies.log("payment_status_processed", local.paymentId, {
        yookassaPaymentId: local.yookassaPaymentId,
        providerStatus,
        source,
        alreadyProcessed: payment.alreadyProcessed,
        subscriptionChanged: payment.subscriptionChanged,
    });
    if (source === "fallback") {
        await dependencies.log("yookassa_fallback_processed", local.paymentId, {
            ...context,
            providerStatus,
            alreadyProcessed: payment.alreadyProcessed,
            subscriptionChanged: payment.subscriptionChanged,
        });
    }

    // processPaymentStatus determines this under a row lock, so only the request
    // that committed the first immutable final transition sends a notification.
    if (!payment.alreadyProcessed) {
        const notificationData = {
            user: local.userLabel,
            paymentId: local.paymentId,
            yookassaPaymentId: local.yookassaPaymentId,
            tariff: local.tariffTitle ? `${local.tariffTitle} (${local.tariffId})` : local.tariffId,
            amount: checked.payment.amount?.value ?? local.amount,
        };
        if (payment.status === "canceled") {
            await dependencies.notify("card_error", {
                ...notificationData,
                cancellationReason: checked.payment.cancellation_details?.reason ?? null,
                cancellationParty: checked.payment.cancellation_details?.party ?? null,
            });
        } else {
            let subscriptionExpiration: Date | string | null = null;
            try {
                subscriptionExpiration = await dependencies.getSubscriptionExpiration(local.userId);
            } catch {
                // Optional notification enrichment must not affect a completed payment.
            }
            await dependencies.notify("success", { ...notificationData, subscriptionExpiration });
        }
    }

    return { outcome: "checked", providerStatus, finalStatus: true, payment };
}
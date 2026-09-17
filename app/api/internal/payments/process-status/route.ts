import { NextRequest, NextResponse } from "next/server";
import { getProviderPaymentContext } from "@/app/lib/db";
import { processAuthoritativePayment } from "@/app/lib/authoritativePaymentProcessor";
import {
    hasValidInternalSecret,
    parseInternalPaymentStatus,
} from "@/app/lib/internalPaymentStatusRequest";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { sendPaymentTelegramNotification } from "@/app/lib/paymentTelegramNotifier";

export async function POST(request: NextRequest) {
    if (!hasValidInternalSecret(request.headers.get("authorization"), process.env.PAYMENT_INTERNAL_SECRET)) {
        return NextResponse.json({ code: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ code: "INVALID_REQUEST", error: "Request body must be valid JSON" }, { status: 400 });
    }

    const input = parseInternalPaymentStatus(body);
    if (!input) {
        return NextResponse.json({ code: "INVALID_REQUEST", error: "Invalid payment status payload" }, { status: 400 });
    }

    let local: Awaited<ReturnType<typeof getProviderPaymentContext>> = null;
    let stage = "обработка webhook";
    try {
        await logPaymentEvent("yookassa_webhook_received", null, { yookassaPaymentId: input.yookassaPaymentId, event: input.event });
        local = await getProviderPaymentContext(input.yookassaPaymentId);
        if (!local) {
            await logPaymentEvent("provider_payment_not_found", null, {
                yookassaPaymentId: input.yookassaPaymentId,
            });
            return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
        }

        const paymentId = local.paymentId;
        stage = "проверка YooKassa";
        const result = await processAuthoritativePayment(local, "webhook");
        if (result.outcome === "provider_error") {
            return NextResponse.json({ code: "PROVIDER_CHECK_FAILED", error: "Provider verification unavailable" }, { status: 502 });
        }
        if (result.outcome === "integrity_error") {
            return NextResponse.json({ code: "PAYMENT_INTEGRITY_FAILED", error: "Payment integrity verification failed" }, { status: 503 });
        }
        const payment = result.payment;
        if (!payment) {
            if (result.finalStatus) {
                return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
            }
            return NextResponse.json({ paymentId, status: result.providerStatus, processed: false });
        }

        return NextResponse.json({
            paymentId: payment.paymentId,
            status: payment.status,
            alreadyProcessed: payment.alreadyProcessed,
            subscriptionChanged: payment.subscriptionChanged,
        });
    } catch (error) {
        await sendPaymentTelegramNotification("error", {
            user: local?.userLabel ?? local?.userId,
            paymentId: local?.paymentId,
            yookassaPaymentId: input.yookassaPaymentId,
            tariff: local?.tariffTitle ?? local?.tariffId,
            error,
            stage,
        });
        await logPaymentEvent("payment_processing_exception", local?.paymentId ?? null, {
            yookassaPaymentId: input.yookassaPaymentId,
            stage,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        return NextResponse.json({ code: "PAYMENT_PROCESSING_FAILED", error: "Payment processing failed" }, { status: 500 });
    }
}
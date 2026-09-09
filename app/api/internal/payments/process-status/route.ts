import { NextRequest, NextResponse } from "next/server";
import db, { getProviderPaymentContext } from "@/app/lib/db";
import {
    hasValidInternalSecret,
    parseInternalPaymentStatus,
} from "@/app/lib/internalPaymentStatusRequest";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { processPaymentStatus } from "@/app/lib/processPaymentStatus";
import { finalStatusToProcess, getYookassaPayment, paymentIntegrityError } from "@/app/lib/yookassaStatusClient";

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

    await logPaymentEvent("yookassa_webhook_received", null, { yookassaPaymentId: input.yookassaPaymentId, event: input.event });
    const local = await getProviderPaymentContext(input.yookassaPaymentId);
    if (!local) {
        await logPaymentEvent("provider_payment_not_found", null, {
            yookassaPaymentId: input.yookassaPaymentId,
        });
        return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
    }

    const paymentId = local.paymentId;
    const context = { paymentId, yookassaPaymentId: local.yookassaPaymentId, userId: local.userId, tariffId: local.tariffId, orderNumber: local.orderNumber };
    await logPaymentEvent("yookassa_status_check_started", paymentId, context);
    const checked = await getYookassaPayment(input.yookassaPaymentId);
    if (checked.outcome === "error") {
        await logPaymentEvent("yookassa_status_check_failed", paymentId, { ...context, errorCategory: checked.category, httpStatus: checked.httpStatus });
        return NextResponse.json({ code: "PROVIDER_CHECK_FAILED", error: "Provider verification unavailable" }, { status: 502 });
    }
    const providerStatus = checked.payment.status;
    await logPaymentEvent("yookassa_status_check_succeeded", paymentId, { ...context, providerStatus });
    const mismatch = paymentIntegrityError(local, checked.payment);
    if (mismatch) {
        await logPaymentEvent("yookassa_payment_integrity_failed", paymentId, { ...context, providerStatus, errorCategory: mismatch });
        return NextResponse.json({ code: "PAYMENT_INTEGRITY_FAILED", error: "Payment integrity verification failed" }, { status: 503 });
    }
    const finalStatus = finalStatusToProcess(providerStatus);
    if (!finalStatus) {
        return NextResponse.json({ paymentId, status: providerStatus, processed: false });
    }
    // A checkout only becomes a genuinely processing purchase once YooKassa's
    // authoritative API reports success. processPaymentStatus remains the sole
    // owner of subscription mutation and the final succeeded transition.
    if (finalStatus === "succeeded") {
        if (local.status === "canceled" || local.status === "error") {
            return NextResponse.json({ paymentId, status: local.status, processed: false });
        }
        await new db().markPaymentPending(paymentId);
    }

    const payment = await processPaymentStatus({
        paymentId,
        status: finalStatus,
        cancellationReason: checked.payment.cancellation_details?.reason ?? null,
        cancellationParty: checked.payment.cancellation_details?.party ?? null,
    });
    if (!payment) {
        return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
    }

    await logPaymentEvent("payment_status_processed", paymentId, {
        yookassaPaymentId: input.yookassaPaymentId,
        providerStatus,
        alreadyProcessed: payment.alreadyProcessed,
        subscriptionChanged: payment.subscriptionChanged,
    });

    return NextResponse.json({
        paymentId: payment.paymentId,
        status: payment.status,
        alreadyProcessed: payment.alreadyProcessed,
        subscriptionChanged: payment.subscriptionChanged,
    });
}
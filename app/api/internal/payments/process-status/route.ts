import { NextRequest, NextResponse } from "next/server";
import { getPaymentIdByYookassaPaymentId } from "@/app/lib/db";
import {
    hasValidInternalSecret,
    parseInternalPaymentStatus,
} from "@/app/lib/internalPaymentStatusRequest";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { processPaymentStatus } from "@/app/lib/processPaymentStatus";

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

    const paymentId = await getPaymentIdByYookassaPaymentId(input.yookassaPaymentId);
    if (!paymentId) {
        await logPaymentEvent("provider_payment_not_found", null, {
            yookassaPaymentId: input.yookassaPaymentId,
            status: input.status,
        });
        return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
    }

    const payment = await processPaymentStatus({
        paymentId,
        status: input.status,
        cancellationReason: input.cancellationReason,
    });
    if (!payment) {
        return NextResponse.json({ code: "PAYMENT_NOT_FOUND", error: "Payment not found" }, { status: 404 });
    }

    await logPaymentEvent("internal_payment_status_processed", paymentId, {
        yookassaPaymentId: input.yookassaPaymentId,
        status: payment.status,
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
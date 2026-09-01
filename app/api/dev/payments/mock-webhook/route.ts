import { NextRequest, NextResponse } from "next/server";
import db from "@/app/lib/db";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";

type MockWebhookBody = {
    paymentId?: unknown;
    status?: unknown;
    reason?: unknown;
};

export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return new Response("Not found", { status: 404 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { code: "INVALID_REQUEST", error: "Request body must be valid JSON" },
            { status: 400 },
        );
    }

    const fields: MockWebhookBody = typeof body === "object" && body !== null && !Array.isArray(body)
        ? body
        : {};
    const paymentId = typeof fields.paymentId === "string" ? fields.paymentId.trim() : "";

    await logPaymentEvent("mock_webhook_received", paymentId || null, body);

    if (!paymentId) {
        return NextResponse.json(
            { code: "INVALID_REQUEST", error: "paymentId is required" },
            { status: 400 },
        );
    }

    if (fields.status !== "succeeded" && fields.status !== "canceled") {
        return NextResponse.json(
            { code: "INVALID_REQUEST", error: "status must be succeeded or canceled" },
            { status: 400 },
        );
    }

    const reason = typeof fields.reason === "string" ? fields.reason.trim() : "";
    if (fields.status === "canceled" && !reason) {
        return NextResponse.json(
            { code: "INVALID_REQUEST", error: "reason is required for canceled payments" },
            { status: 400 },
        );
    }

    const payment = await new db().applyMockPaymentStatus(
        paymentId,
        fields.status,
        fields.status === "canceled" ? reason : null,
    );

    if (!payment) {
        return NextResponse.json(
            { code: "PAYMENT_NOT_FOUND", error: "Payment not found" },
            { status: 404 },
        );
    }

    return NextResponse.json({
        paymentId: payment.paymentId,
        status: payment.status,
        ...(payment.status === "canceled"
            ? { cancellationReason: payment.cancellationReason }
            : {}),
    });
}
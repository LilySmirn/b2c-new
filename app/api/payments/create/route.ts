import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/app/lib/db";
import { logPaymentEvent } from "@/app/lib/paymentEventLogger";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";

export async function POST(request: NextRequest) {
    const session = await requireActiveB2cSession("api");

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const tariffId = typeof body === "object" && body !== null &&
        typeof (body as { tariffId?: unknown }).tariffId === "string"
        ? (body as { tariffId: string }).tariffId.trim()
        : "";

    if (!tariffId) {
        return NextResponse.json(
            { code: "INVALID_TARIFF_ID", error: "tariffId is required" },
            { status: 400 },
        );
    }

    const paymentId = uuidv4();
    await logPaymentEvent("payment_create_started", paymentId, null);

    const result = await new db().createPendingPayment(
        session.user.id,
        tariffId,
        paymentId,
    );

    if (result.outcome === "tariff_not_found") {
        return NextResponse.json(
            { code: "TARIFF_NOT_FOUND", error: "Tariff not found" },
            { status: 404 },
        );
    }

    if (result.outcome === "already_pending") {
        return NextResponse.json(
            { code: "PAYMENT_ALREADY_PENDING", payment: result.payment },
            { status: 409 },
        );
    }

    await logPaymentEvent("payment_created", paymentId, null);
    return NextResponse.json(result.payment, { status: 201 });
}
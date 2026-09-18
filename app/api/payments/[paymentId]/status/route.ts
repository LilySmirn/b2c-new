import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { reconcilePaymentStatusFallback } from "@/app/lib/paymentStatusFallback";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";

type RouteContext = {
    params: Promise<{ paymentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
    const session = await requireActiveB2cSession("api");

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await context.params;
    let payment = paymentId
        ? await new db().getPaymentStatus(session.user.id, paymentId)
        : null;

    if (!payment) {
        return NextResponse.json(
            { code: "PAYMENT_NOT_FOUND", error: "Payment not found" },
            { status: 404 },
        );
    }

    await reconcilePaymentStatusFallback(session.user.id, payment);
    if (payment.status === "creating" || payment.status === "pending") {
        // The authoritative processor may have committed a final state. Return a
        // fresh local projection; provider data itself is never returned directly.
        payment = await new db().getPaymentStatus(session.user.id, paymentId);
        if (!payment) {
            return NextResponse.json(
                { code: "PAYMENT_NOT_FOUND", error: "Payment not found" },
                { status: 404 },
            );
        }
    }

    return NextResponse.json({
        paymentId: payment.paymentId,
        status: payment.status,
        tariffId: payment.tariffId,
        tariffName: payment.tariffName,
        ...(payment.status === "pending"
            ? { confirmationUrl: payment.confirmationUrl }
            : {}),
        ...(payment.status === "canceled"
            ? { cancellationReason: payment.cancellationReason }
            : {}),
    });
}
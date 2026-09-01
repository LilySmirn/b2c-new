import { NextResponse } from "next/server";
import db from "@/app/lib/db";
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
    const payment = paymentId
        ? await new db().getPaymentStatus(session.user.id, paymentId)
        : null;

    if (!payment) {
        return NextResponse.json(
            { code: "PAYMENT_NOT_FOUND", error: "Payment not found" },
            { status: 404 },
        );
    }

    return NextResponse.json({
        paymentId: payment.paymentId,
        status: payment.status,
        tariffId: payment.tariffId,
        tariffName: payment.tariffName,
        ...(payment.status === "canceled"
            ? { cancellationReason: payment.cancellationReason }
            : {}),
    });
}
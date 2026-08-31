import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";

export async function GET() {
    const session = await requireActiveB2cSession("api");

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payment = await new db().getCurrentPayment(session.user.id);

    if (!payment) {
        return NextResponse.json({ state: "normal" });
    }

    return NextResponse.json({
        state: payment.status,
        paymentId: payment.paymentId,
        tariffId: payment.tariffId,
        tariffName: payment.tariffName,
        ...(payment.status === "canceled"
            ? { cancellationReason: payment.cancellationReason }
            : {}),
    });
}
import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";
import { getDaysUntilExpiration, type SubscriptionReminder } from "../../lib/subscriptionReminder";

export async function GET() {
    const session = await requireActiveB2cSession("api");

    if (!session) {
        return NextResponse.json({ reminder: null }, { status: 401 });
    }

    const expiration = await new db().getSubscriptionExpirationReminder(session.user.id);

    if (!expiration) {
        return NextResponse.json({ reminder: null });
    }

    const reminder: SubscriptionReminder = {
        subscriptionId: expiration.subscriptionId,
        expirationDate: expiration.expirationDate.toISOString(),
        daysLeft: getDaysUntilExpiration(expiration.expirationDate),
        tariffTitle: expiration.tariffTitle,
    };

    return NextResponse.json({ reminder });
}
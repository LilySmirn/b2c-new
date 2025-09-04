import { NextRequest, NextResponse } from 'next/server';
import db from '@/app/lib/db';

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (body.event !== 'payment.succeeded') {
        return NextResponse.json({ message: 'Ignored event' }, { status: 200 });
    }

    const payment = body.object;
    const userId = payment.metadata?.user_id;
    const tariffId = payment.metadata?.tariff_id;

    if (!userId || !tariffId) {
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    const database = new db();
    await database.addOrUpdateSubscription(userId, tariffId, expirationDate, true);

    return NextResponse.json({ message: 'Subscription saved' }, { status: 200 });
}

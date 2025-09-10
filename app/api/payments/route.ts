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

    const database = new db();

    const durationInMonths = await database.getTariffDuration(tariffId);
    if (!durationInMonths) {
        return NextResponse.json({ error: 'Tariff not found' }, { status: 400 });
    }

    const currentSubscription = await database.getSubscription(userId);

    const currentDate = new Date();

    if (currentSubscription) {
        const currentExpirationDate= new Date(currentSubscription.expiration_date);
        const expirationDate = new Date(currentExpirationDate);
        expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

        await database.updateSubscription(currentSubscription.id, expirationDate);
    } else {
        const expirationDate = new Date(currentDate);
        expirationDate.setMonth(expirationDate.getMonth() + durationInMonths);

        await database.addSubscription(userId, tariffId, currentDate, expirationDate);
    }

    return NextResponse.json({ message: 'Subscription saved' }, { status: 200 });
}

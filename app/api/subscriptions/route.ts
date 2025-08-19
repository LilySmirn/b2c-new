import { NextResponse } from 'next/server';
import db from '@/app/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const subscriptions = await new db().getUserSubscriptions(userId ?? '');

    return NextResponse.json(subscriptions);
}

export async function POST(req: Request) {
    try {
        const { state, userId, tariffId } = await req.json();
        await new db().updateAutoRenewal(userId, tariffId, state);
    } catch (error) {
        NextResponse.json({error: error});
    }

    return NextResponse.json({ ok: true });
}

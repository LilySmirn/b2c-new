import { NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { logError, logInfo } from "@/app/lib/logger";
import { ErrorType } from "@/app/types/ErrorType";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const subscriptions = await new db().getUserSubscriptions(userId ?? '');

    return NextResponse.json(subscriptions);
}

export async function POST(req: Request) {
    try {
        const { state, id } = await req.json();
        await new db().updateAutoRenewal(id, state);
        await logInfo("SubscriptionAutoRenewalUpdated", `Successfully updated to ${state}`);
    } catch (error) {
        await logError(error, ErrorType.SubscriptionAutoRenewalUpdate, null);
        NextResponse.json({error: error});
    }

    return NextResponse.json({ ok: true });
}

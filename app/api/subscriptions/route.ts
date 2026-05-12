import { NextResponse } from 'next/server';
import db from '@/app/lib/db';
import { logInfo, NextErrorResponse } from "@/app/lib/logger";
import { ErrorType } from "@/app/types/ErrorType";
import { InfoType } from "@/app/types/InfoType";

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
        await logInfo(InfoType.SubscriptionAutoRenewalUpdated, `Successfully updated to ${state}`);
    } catch (error) {
        return NextErrorResponse(ErrorType.SubscriptionAutoRenewalUpdate, error, 500, null);
    }

    return NextResponse.json({ ok: true });
}

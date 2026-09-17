import { NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/app/lib/telegramNotification';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message } = body;

        const result = await sendTelegramNotification("general_error", `Ошибка на сайте:\n${message}`);
        if (!result.sent) return NextResponse.json({ success: false }, { status: 502 });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

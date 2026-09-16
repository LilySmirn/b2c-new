import { NextResponse } from 'next/server';
import { getTelegramSafeErrorCode, sendTelegramRequest } from '@/app/lib/telegramTransport';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message } = body;

        const token = process.env.TELEGRAM_ERROR_BOT_TOKEN!;
        const chatId = process.env.TELEGRAM_ERROR_CHAT_ID!;

        await sendTelegramRequest(token, {
            chat_id: chatId,
            text: `Ошибка на сайте:\n${message}`,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(getTelegramSafeErrorCode(error));
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

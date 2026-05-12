import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message } = body;

        const token = process.env.TELEGRAM_ERROR_BOT_TOKEN!;
        const chatId = process.env.TELEGRAM_ERROR_CHAT_ID!;

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `Ошибка на сайте:\n${message}`,
            }),
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Ошибка при отправке ошибки в Telegram', err);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}

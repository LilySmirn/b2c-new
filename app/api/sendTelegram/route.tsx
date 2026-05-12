import { NextResponse } from "next/server";
import {logError, NextErrorResponse} from "@/app/lib/logger";
import {ErrorType} from "@/app/types/ErrorType";

export async function POST(req: Request) {
    try {
        const { email, name, phone, crm } = await req.json();

        if (!email || !name || !phone) {
            return NextResponse.json({ message: "Заполните обязательные поля" }, { status: 400 });
        }

        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
            return NextResponse.json({ message: "Нет настроек Telegram" }, { status: 500 });
        }

        const message = `
Новая заявка:
Имя: ${name}
Email: ${email}
Телефон: ${phone}
Клиника: ${crm || "—"}
`;

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
            }),
        });

        if (!tgRes.ok) {
            return await NextErrorResponse(ErrorType.SendTelegramSendingFailed, 'Error sending to Telegram', 500, null);
        }

        return NextResponse.json({ message: "Заявка успешно отправлена!" }, { status: 200 });
    } catch (error) {
        return await NextErrorResponse(ErrorType.SendTelegramServerError, error, 500, null);
    }
}

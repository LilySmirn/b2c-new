import { NextResponse } from "next/server";
import {logError} from "@/app/lib/logger";
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
            await logError('Error sending to Telegram', ErrorType.SendTelegramSendingFailed);
            return NextResponse.json({ message: "Ошибка при отправке в Telegram" }, { status: 500 });
        }

        return NextResponse.json({ message: "Заявка успешно отправлена!" }, { status: 200 });
    } catch (error) {
        // TODO: make function incapsulating response and logging
        await logError(error, ErrorType.SendTelegramServerError);
        return NextResponse.json({ message: "Ошибка сервера" }, { status: 500 });
    }
}

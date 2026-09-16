import { NextResponse } from "next/server";
import {getTelegramSafeErrorCode, sendTelegramRequest} from "@/app/lib/telegramTransport";

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

        const tgRes = await sendTelegramRequest(token, {
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
        });

        if (!tgRes.ok) {
            console.error("telegram_api_http_error", tgRes.status);
            return NextResponse.json({ message: "Не удалось отправить заявку" }, { status: 502 });
        }

        return NextResponse.json({ message: "Заявка успешно отправлена!" }, { status: 200 });
    } catch (error) {
        console.error(getTelegramSafeErrorCode(error));
        return NextResponse.json({ message: "Не удалось отправить заявку" }, { status: 502 });
    }
}

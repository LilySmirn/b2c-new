import { NextResponse } from "next/server";
import { sendTelegramNotification } from "@/app/lib/telegramNotification";

export async function POST(req: Request) {
    try {
        const { email, name, phone, crm } = await req.json();

        if (!email || !name || !phone) {
            return NextResponse.json({ message: "Заполните обязательные поля" }, { status: 400 });
        }

        const message = `
Новая заявка:
Имя: ${name}
Email: ${email}
Телефон: ${phone}
Клиника: ${crm || "—"}
`;

        const tgRes = await sendTelegramNotification("feedback", message, { parseMode: "HTML" });

        if (!tgRes.sent) {
            return NextResponse.json({ message: "Не удалось отправить заявку" }, { status: 502 });
        }

        return NextResponse.json({ message: "Заявка успешно отправлена!" }, { status: 200 });
    } catch {
        return NextResponse.json({ message: "Не удалось отправить заявку" }, { status: 502 });
    }
}

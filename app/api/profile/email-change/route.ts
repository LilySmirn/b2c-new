import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { createEmailChangeToken, EMAIL_CHANGE_TTL_MS } from "@/app/lib/emailChangeToken";
import { sendMail } from "@/app/lib/mailer";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";
import { normalizeLogin } from "@/app/modules/userBlocking/server/loginAttemptLimiter";
import { getApplicationBaseUrl } from "@/app/lib/applicationBaseUrl";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!);
}

export async function POST(request: Request) {
    const session = await requireActiveB2cSession("api");
    if (!session) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });

    try {
        const body: unknown = await request.json();
        const requestedEmail = body && typeof body === "object" && "email" in body
            ? (body as { email?: unknown }).email : null;
        const newEmail = typeof requestedEmail === "string" ? normalizeLogin(requestedEmail) : "";
        if (!newEmail || !EMAIL_PATTERN.test(newEmail)) {
            return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
        }

        const database = new db();
        const user = await database.getCurrentUser(session.user.id);
        if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
        if (newEmail === normalizeLogin(user.login)) {
            return NextResponse.json({ error: "Новый email должен отличаться от текущего" }, { status: 400 });
        }
        if (await database.findUserByLogin(newEmail)) {
            return NextResponse.json({ error: "Этот email уже используется" }, { status: 409 });
        }

        const token = createEmailChangeToken({
            userId: String(user.user_id),
            oldEmail: user.login,
            newEmail,
            expiresAt: Date.now() + EMAIL_CHANGE_TTL_MS,
        });
        const confirmationUrl = `${getApplicationBaseUrl(request)}/api/profile/email-change/confirm?token=${encodeURIComponent(token)}`;
        const safeEmail = escapeHtml(newEmail);
        await sendMail(user.login, "Подтверждение изменения email", `
            <p>Вы запросили изменение email вашего аккаунта на ${safeEmail}.</p>
            <p>Вы действительно хотите изменить email?</p>
            <p>Если да, перейдите по ссылке ниже для подтверждения изменения.</p>
            <p><a href="${escapeHtml(confirmationUrl)}">Подтвердить изменение email</a></p>
            <p>Ссылка действует 24 часа.</p>
            <p>Если вы не запрашивали изменение email, просто проигнорируйте это письмо.</p>
        `);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email change request failed", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте позже" }, { status: 500 });
    }
}
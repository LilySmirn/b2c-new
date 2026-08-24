import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { sendMail } from "@/app/lib/mailer";
import { normalizeLogin } from "@/app/modules/userBlocking/server/loginAttemptLimiter";
import {
    createPasswordFingerprint,
    createPasswordResetToken,
    PASSWORD_RESET_TTL_MS,
} from "@/app/lib/passwordResetToken";
import { registerPasswordResetRequest } from "@/app/lib/passwordResetRateLimiter";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_MESSAGE = "Если аккаунт с таким email существует, мы отправили письмо со ссылкой для восстановления пароля.";

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]!);
}

function getAppUrl(): string {
    const configured = process.env.APP_URL;
    if (!configured) throw new Error("APP_URL is not configured");
    const url = new URL(configured);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("APP_URL is invalid");
    return url.origin;
}

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const rawEmail = body && typeof body === "object" && "email" in body
        ? (body as { email?: unknown }).email : null;
    const email = typeof rawEmail === "string" ? normalizeLogin(rawEmail) : "";
    if (!email || !EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
    }

    const rateLimit = registerPasswordResetRequest(email);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { message: GENERIC_MESSAGE, retryAfterSeconds: rateLimit.retryAfterSeconds },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
    }

    try {
        // Resolve configuration before looking up the account, so an absent secret
        // can never result in a successful response for a link that was not sent.
        const appUrl = getAppUrl();
        if (!process.env.PASSWORD_RESET_SECRET) throw new Error("PASSWORD_RESET_SECRET is not configured");

        const user = await new db().findUserByLogin(email);
        if (user?.password_hash) {
            const token = createPasswordResetToken({
                userId: String(user.user_id),
                email: user.login,
                expiresAt: Date.now() + PASSWORD_RESET_TTL_MS,
                passwordFingerprint: createPasswordFingerprint(user.password_hash),
            });
            const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
            await sendMail(user.login, "Восстановление пароля", `
                <p>Вы запросили восстановление пароля для вашего аккаунта.</p>
                <p>Чтобы создать новый пароль, перейдите по ссылке ниже:</p>
                <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 22px;background:#0085ff;color:#fff;text-decoration:none;border-radius:8px">Восстановить пароль</a></p>
                <p>Ссылка действует 1 час.</p>
                <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
            `);
        }
        return NextResponse.json({ message: GENERIC_MESSAGE, retryAfterSeconds: 60 });
    } catch (error) {
        console.error("Password reset request failed", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: "Не удалось отправить письмо. Попробуйте позже" }, { status: 503 });
    }
}
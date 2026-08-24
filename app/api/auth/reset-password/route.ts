import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { getPasswordValidationError } from "@/app/lib/passwordValidation";
import { createPasswordFingerprint, verifyPasswordResetToken } from "@/app/lib/passwordResetToken";
import { normalizeLogin } from "@/app/modules/userBlocking/server/loginAttemptLimiter";

async function resolveUser(token: string) {
    const payload = verifyPasswordResetToken(token);
    if (!payload || Date.now() > payload.expiresAt || normalizeLogin(payload.email) !== payload.email) return null;
    const user = await new db().findUserById(payload.userId);
    if (!user?.password_hash || user.login !== payload.email) return null;
    if (createPasswordFingerprint(user.password_hash) !== payload.passwordFingerprint) return null;
    return { user, payload };
}

function invalidResponse() {
    return NextResponse.json({ error: "Ссылка для восстановления пароля недействительна или срок её действия истёк." }, { status: 400 });
}

export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    try {
        return (token && await resolveUser(token))
            ? NextResponse.json({ valid: true })
            : invalidResponse();
    } catch {
        return invalidResponse();
    }
}

export async function POST(request: Request) {
    const body: unknown = await request.json().catch(() => null);
    const token = body && typeof body === "object" && "token" in body && typeof (body as { token?: unknown }).token === "string"
        ? (body as { token: string }).token : "";
    const password = body && typeof body === "object" && "password" in body
        ? (body as { password?: unknown }).password : null;
    const passwordError = getPasswordValidationError(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    try {
        const resolved = token ? await resolveUser(token) : null;
        if (!resolved) return invalidResponse();
        const passwordHash = await bcrypt.hash(password as string, 10);
        const changed = await new db().resetUserPassword(
            resolved.payload.userId,
            resolved.payload.email,
            resolved.user.password_hash!,
            passwordHash
        );
        return changed === 1 ? NextResponse.json({ success: true }) : invalidResponse();
    } catch (error) {
        console.error("Password reset failed", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: "Не удалось изменить пароль. Попробуйте позже" }, { status: 500 });
    }
}
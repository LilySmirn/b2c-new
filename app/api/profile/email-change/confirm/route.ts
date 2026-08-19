import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { verifyEmailChangeToken } from "@/app/lib/emailChangeToken";
import { normalizeLogin } from "@/app/modules/userBlocking/server/loginAttemptLimiter";
import { getApplicationBaseUrl } from "@/app/lib/applicationBaseUrl";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function redirectTo(request: Request, path: string): NextResponse {
    return NextResponse.redirect(new URL(path, getApplicationBaseUrl(request)));
}

function isDuplicateKeyError(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error &&
        (error as { code?: unknown }).code === "ER_DUP_ENTRY");
}

export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return redirectTo(request, "/profile/email-change-error");

    const payload = verifyEmailChangeToken(token);
    if (!payload || Date.now() > payload.expiresAt ||
        !EMAIL_PATTERN.test(payload.oldEmail) || !EMAIL_PATTERN.test(payload.newEmail) ||
        payload.oldEmail === payload.newEmail ||
        normalizeLogin(payload.newEmail) !== payload.newEmail) {
        return redirectTo(request, "/profile/email-change-error");
    }

    try {
        const database = new db();
        const user = await database.getCurrentUser(payload.userId);
        if (!user || user.login !== payload.oldEmail) {
            return redirectTo(request, "/profile/email-change-error?reason=used");
        }
        if (await database.findUserByLogin(payload.newEmail)) {
            return redirectTo(request, "/profile/email-change-error?reason=occupied");
        }

        const affectedRows = await database.changeUserEmail(
            payload.userId, payload.oldEmail, payload.newEmail
        );
        if (affectedRows !== 1) return redirectTo(request, "/profile/email-change-error");

        return redirectTo(request, "/profile/email-changed");
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return redirectTo(request, "/profile/email-change-error?reason=occupied");
        }
        console.error("Email change confirmation failed");
        return redirectTo(request, "/profile/email-change-error");
    }
}
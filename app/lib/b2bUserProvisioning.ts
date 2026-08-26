import crypto from "crypto";
import { isIP } from "net";

import { normalizeLogin } from "@/app/modules/userBlocking/server/loginAttemptLimiter";

export const B2B_LOGIN_MAX_LENGTH = 100;
export const B2B_PASSWORD_LENGTH = 16;

type B2bUserPayload = {
    login?: unknown;
    ip?: unknown;
};

export type ValidB2bUserPayload = {
    login: string;
    ip: string | null;
};

export function hasValidAdminAuthorization(request: Request): boolean {
    const configuredSecret = process.env.B2B_ADMIN_SECRET;
    const authorization = request.headers.get("authorization");

    if (!configuredSecret || !authorization?.startsWith("Bearer ")) {
        return false;
    }

    const suppliedSecret = authorization.slice("Bearer ".length);
    if (!suppliedSecret) {
        return false;
    }

    // Comparing fixed-length digests avoids leaking either secret's length.
    const expectedDigest = crypto.createHash("sha256").update(configuredSecret).digest();
    const suppliedDigest = crypto.createHash("sha256").update(suppliedSecret).digest();

    return crypto.timingSafeEqual(expectedDigest, suppliedDigest);
}

export function validateB2bUserPayload(payload: unknown):
    | { value: ValidB2bUserPayload }
    | { error: string } {
    const body = payload && typeof payload === "object" ? payload as B2bUserPayload : {};
    const login = typeof body.login === "string" ? normalizeLogin(body.login) : "";

    if (!login) {
        return { error: "Логин обязателен" };
    }

    if (login.length > B2B_LOGIN_MAX_LENGTH) {
        return { error: `Логин не должен превышать ${B2B_LOGIN_MAX_LENGTH} символов` };
    }

    if (body.ip !== undefined && body.ip !== null && typeof body.ip !== "string") {
        return { error: "IP-адрес должен быть строкой или null" };
    }

    const ip = typeof body.ip === "string" ? body.ip.trim() : "";
    if (ip && isIP(ip) === 0) {
        return { error: "Некорректный IP-адрес" };
    }

    return { value: { login, ip: ip || null } };
}

export function generateB2bPassword(): string {
    const requiredCharacters = [
        randomCharacter("ABCDEFGHJKLMNPQRSTUVWXYZ"),
        randomCharacter("abcdefghijkmnopqrstuvwxyz"),
        randomCharacter("23456789"),
        randomCharacter("!@#$%_-"),
    ];
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%_-";

    while (requiredCharacters.length < B2B_PASSWORD_LENGTH) {
        requiredCharacters.push(randomCharacter(alphabet));
    }

    for (let index = requiredCharacters.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(index + 1);
        [requiredCharacters[index], requiredCharacters[swapIndex]] =
            [requiredCharacters[swapIndex], requiredCharacters[index]];
    }

    return requiredCharacters.join("");
}

function randomCharacter(alphabet: string): string {
    return alphabet[crypto.randomInt(alphabet.length)];
}
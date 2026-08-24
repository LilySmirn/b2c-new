import { createHmac, timingSafeEqual } from "crypto";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type PasswordResetPayload = {
    userId: string;
    email: string;
    expiresAt: number;
    passwordFingerprint: string;
};

function getSecret(): string {
    const secret = process.env.PASSWORD_RESET_SECRET;
    if (!secret) throw new Error("PASSWORD_RESET_SECRET is not configured");
    return secret;
}

function hmac(value: string): Buffer {
    return createHmac("sha256", getSecret()).update(value).digest();
}

export function createPasswordFingerprint(passwordHash: string): string {
    return hmac(`password:${passwordHash}`).toString("base64url");
}

export function createPasswordResetToken(payload: PasswordResetPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${hmac(`token:${encoded}`).toString("base64url")}`;
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
        const supplied = Buffer.from(parts[1], "base64url");
        const expected = hmac(`token:${parts[0]}`);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

        const payload: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        if (!payload || typeof payload !== "object") return null;
        const value = payload as Partial<PasswordResetPayload>;
        if (typeof value.userId !== "string" || !value.userId ||
            typeof value.email !== "string" || !value.email ||
            typeof value.expiresAt !== "number" || !Number.isFinite(value.expiresAt) ||
            typeof value.passwordFingerprint !== "string" || !value.passwordFingerprint) return null;
        return value as PasswordResetPayload;
    } catch {
        return null;
    }
}
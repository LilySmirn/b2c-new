import { createHmac, timingSafeEqual } from "crypto";

export const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export type EmailChangePayload = {
    userId: string;
    oldEmail: string;
    newEmail: string;
    expiresAt: number;
};

function getSecret(): string {
    const secret = process.env.EMAIL_CHANGE_SECRET;
    if (!secret) {
        throw new Error("EMAIL_CHANGE_SECRET is not configured");
    }
    return secret;
}

function sign(encodedPayload: string): Buffer {
    return createHmac("sha256", getSecret()).update(encodedPayload).digest();
}

export function createEmailChangeToken(payload: EmailChangePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encodedPayload}.${sign(encodedPayload).toString("base64url")}`;
}

export function verifyEmailChangeToken(token: string): EmailChangePayload | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

        const suppliedSignature = Buffer.from(parts[1], "base64url");
        const expectedSignature = sign(parts[0]);
        if (
            suppliedSignature.length !== expectedSignature.length ||
            !timingSafeEqual(suppliedSignature, expectedSignature)
        ) return null;

        const payload: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        if (!payload || typeof payload !== "object") return null;
        const value = payload as Partial<EmailChangePayload>;
        if (
            typeof value.userId !== "string" || !value.userId ||
            typeof value.oldEmail !== "string" || !value.oldEmail ||
            typeof value.newEmail !== "string" || !value.newEmail ||
            typeof value.expiresAt !== "number" || !Number.isFinite(value.expiresAt)
        ) return null;

        return value as EmailChangePayload;
    } catch {
        return null;
    }
}
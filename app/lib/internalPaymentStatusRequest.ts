import { timingSafeEqual } from "node:crypto";
export type InternalPaymentStatusInput = {
    yookassaPaymentId: string;
    event: string | null;
};

export function hasValidInternalSecret(authorization: string | null, secret: string | undefined): boolean {
    if (!secret || !authorization?.startsWith("Bearer ")) return false;
    const provided = Buffer.from(authorization.slice(7), "utf8");
    const expected = Buffer.from(secret, "utf8");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function parseInternalPaymentStatus(body: unknown): InternalPaymentStatusInput | null {
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const fields = body as Record<string, unknown>;
    const yookassaPaymentId = typeof fields.yookassaPaymentId === "string"
        ? fields.yookassaPaymentId.trim()
        : "";
    if (!yookassaPaymentId) return null;

    return {
        yookassaPaymentId,
        event: typeof fields.event === "string" ? fields.event : null,
    };
}
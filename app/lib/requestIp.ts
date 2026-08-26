export function normalizeIp(ip: string | null | undefined): string | null {
    const normalizedIp = ip?.trim().replace(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i, "$1");

    return normalizedIp === undefined || normalizedIp === "" ? null : normalizedIp;
}

export function getForwardedIp(headers: Record<string, string | string[] | undefined> | undefined): string | null {
    const forwardedFor = headers?.["x-forwarded-for"];
    const rawValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const realIp = headers?.["x-real-ip"];
    const rawRealIp = Array.isArray(realIp) ? realIp[0] : realIp;

    return (normalizeIp(rawValue?.split(",")[0]) ?? normalizeIp(rawRealIp))?.slice(0, 45) ?? null;
}
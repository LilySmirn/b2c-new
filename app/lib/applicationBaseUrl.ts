const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function firstHeaderValue(value: string | null): string | null {
    return value?.split(",")[0]?.trim() || null;
}

function parseOrigin(value: string | undefined): URL | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

function requestOrigin(request: Request): URL {
    const requestUrl = new URL(request.url);
    const host = firstHeaderValue(request.headers.get("x-forwarded-host"))
        || firstHeaderValue(request.headers.get("host"));
    const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto"))
        || requestUrl.protocol.replace(":", "");
    return host ? new URL(`${protocol}://${host}`) : new URL(requestUrl.origin);
}

/** Resolve email links at request time, avoiding build-time public URL values. */
export function getApplicationBaseUrl(request: Request): string {
    const incomingOrigin = requestOrigin(request);

    // Local mail must point back to the local server even if .env also contains
    // a production URL.
    if (process.env.NODE_ENV !== "production") return incomingOrigin.origin;

    // Prefer server-only canonical configuration and ignore stale localhost.
    for (const configured of [process.env.APP_URL, process.env.NEXTAUTH_URL]) {
        const url = parseOrigin(configured);
        if (url && !LOCAL_HOSTNAMES.has(url.hostname)) return url.origin;
    }

    // Reverse proxies normally expose the real public origin in these headers.
    if (!LOCAL_HOSTNAMES.has(incomingOrigin.hostname)) return incomingOrigin.origin;

    throw new Error("A public application URL is not configured");
}
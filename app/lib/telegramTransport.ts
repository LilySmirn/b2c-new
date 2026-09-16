import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import type { ClientRequestArgs } from "node:http";
import type { Duplex } from "node:stream";
import { SocksProxyAgent } from "socks-proxy-agent";

const TELEGRAM_HOST = "api.telegram.org";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TELEGRAM_ERROR_BODY_BYTES = 64 * 1024;

export type TelegramTransportMode = "direct" | "http_proxy" | "https_proxy" | "socks5_proxy";

type TelegramProxyProtocol = "http" | "https" | "socks5";

type ProxyConfiguration = {
    host: string;
    port: number;
    username: string;
    password: string;
    protocol: TelegramProxyProtocol;
};

export class TelegramProxyConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TelegramProxyConfigurationError";
    }
}

export class TelegramTransportError extends Error {
    constructor(
        public readonly code: string,
        public readonly stage: TelegramErrorStage = "telegram_request",
        public readonly causeCode?: string,
        public readonly causeName?: string,
    ) {
        super(code);
        this.name = "TelegramTransportError";
    }
}

export type TelegramErrorStage = "configuration" | "proxy_connect" | "tls" | "telegram_request" | "telegram_response";

export type TelegramSafeErrorDetails = {
    reason: string;
    stage: TelegramErrorStage;
    errorName?: string;
    errorCode?: string;
};

export type TelegramApiError = {
    ok?: boolean;
    errorCode?: number;
    description?: string;
};

export type TelegramRequestResult = {
    ok: boolean;
    status: number;
    transport: TelegramTransportMode;
    telegramError?: TelegramApiError;
};

function redactDiagnosticValue(value: string, secrets: readonly string[]): string {
    let redacted = value.replace(/\/bot\d+:[A-Za-z0-9_-]+/g, "/bot[REDACTED]");
    for (const secret of secrets) {
        if (secret) redacted = redacted.split(secret).join("[REDACTED]");
    }
    return redacted.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 1_000);
}

/** Extracts only documented Bot API error fields; arbitrary response fields are discarded. */
export function parseTelegramApiError(body: string, secrets: readonly string[] = []): TelegramApiError | undefined {
    try {
        const parsed: unknown = JSON.parse(body);
        if (!parsed || typeof parsed !== "object") return undefined;
        const value = parsed as Record<string, unknown>;
        const result: TelegramApiError = {};
        if (typeof value.ok === "boolean") result.ok = value.ok;
        if (typeof value.error_code === "number" && Number.isSafeInteger(value.error_code)) {
            result.errorCode = value.error_code;
        }
        if (typeof value.description === "string") {
            result.description = redactDiagnosticValue(value.description, secrets);
        }
        return Object.keys(result).length > 0 ? result : undefined;
    } catch {
        return undefined;
    }
}

function underlyingErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;
    const code = String(error.code);
    return /^[A-Z][A-Z0-9_]+$/.test(code) ? code : undefined;
}

/** Contains only allow-listed metadata and is safe to print without leaking URLs or credentials. */
export function getTelegramSafeErrorDetails(error: unknown): TelegramSafeErrorDetails {
    if (error instanceof TelegramTransportError) {
        return {
            reason: error.code,
            stage: error.stage,
            ...(error.causeName ? { errorName: error.causeName } : {}),
            ...(error.causeCode ? { errorCode: error.causeCode } : {}),
        };
    }
    if (error instanceof TelegramProxyConfigurationError) {
        return { reason: error.message, stage: "configuration", errorName: error.name };
    }
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
        return { reason: "telegram_api_timeout", stage: "telegram_request", errorName: error.name };
    }
    return {
        reason: "telegram_request_failed",
        stage: "telegram_request",
        ...(error instanceof Error ? { errorName: error.name } : {}),
        ...(underlyingErrorCode(error) ? { errorCode: underlyingErrorCode(error) } : {}),
    };
}

export function getTelegramSafeErrorCode(error: unknown): string {
    return getTelegramSafeErrorDetails(error).reason;
    return "telegram_request_failed";
}

function proxySocketErrorCode(error: unknown): string {
    if (error instanceof TelegramTransportError) return error.code;
    if (error && typeof error === "object" && "code" in error && error.code === "ETIMEDOUT") {
        return "telegram_proxy_tcp_timeout";
    }
    return "telegram_proxy_connect_failed";
}

function readProxyConfiguration(): ProxyConfiguration | null {
    const names = [
        "TELEGRAM_PROXY_HOST",
        "TELEGRAM_PROXY_PORT",
        "TELEGRAM_PROXY_USERNAME",
        "TELEGRAM_PROXY_PASSWORD",
        "TELEGRAM_PROXY_PROTOCOL",
    ] as const;
    const values = Object.fromEntries(names.map((name) => [name, process.env[name]?.trim() ?? ""])) as Record<typeof names[number], string>;
    const configured = names.filter((name) => values[name] !== "");

    if (configured.length === 0) return null;

    const missing = names.filter((name) => values[name] === "");
    if (missing.length > 0) {
        throw new TelegramProxyConfigurationError(`telegram_proxy_configuration_invalid: missing ${missing.join(", ")}`);
    }

    if (!/^[a-zA-Z0-9.-]+$/.test(values.TELEGRAM_PROXY_HOST)) {
        throw new TelegramProxyConfigurationError("telegram_proxy_configuration_invalid: TELEGRAM_PROXY_HOST must be a hostname or IP address");
    }

    const port = Number(values.TELEGRAM_PROXY_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new TelegramProxyConfigurationError("telegram_proxy_configuration_invalid: TELEGRAM_PROXY_PORT must be an integer from 1 to 65535");
    }

    const protocol = values.TELEGRAM_PROXY_PROTOCOL.toLowerCase();
    if (protocol !== "http" && protocol !== "https" && protocol !== "socks5") {
        throw new TelegramProxyConfigurationError("telegram_proxy_configuration_invalid: TELEGRAM_PROXY_PROTOCOL must be http, https, or socks5");
    }

    return {
        host: values.TELEGRAM_PROXY_HOST,
        port,
        username: values.TELEGRAM_PROXY_USERNAME,
        password: values.TELEGRAM_PROXY_PASSWORD,
        protocol,
    };
}

function transportMode(proxy: ProxyConfiguration | null): TelegramTransportMode {
    if (!proxy) return "direct";
    if (proxy.protocol === "socks5") return "socks5_proxy";
    return proxy.protocol === "https" ? "https_proxy" : "http_proxy";
}

export function getTelegramTransportMode(): TelegramTransportMode {
    return transportMode(readProxyConfiguration());
}

class TelegramHttpsProxyAgent extends https.Agent {
    constructor(
        private readonly proxy: ProxyConfiguration,
        private readonly connectionTimeoutMs: number,
    ) {
        super({ keepAlive: false });
    }

    override createConnection(
        _options: ClientRequestArgs,
        callback?: (error: Error | null, socket: Duplex) => void,
    ): Duplex {
        let completed = false;
        const finish = (error: Error | null, socket?: tls.TLSSocket) => {
            if (completed) return;
            completed = true;
            if (socket) callback?.(error, socket);
            else callback?.(error, proxySocket);
        };
        const proxySocket = this.proxy.protocol === "https"
            ? tls.connect({
                host: this.proxy.host,
                port: this.proxy.port,
                servername: net.isIP(this.proxy.host) ? undefined : this.proxy.host,
            })
            : net.connect({
                host: this.proxy.host,
                port: this.proxy.port,
            });

        proxySocket.setTimeout(this.connectionTimeoutMs, () => {
            proxySocket.destroy(new TelegramTransportError("telegram_proxy_tcp_timeout", "proxy_connect"));
        });
        proxySocket.once("error", (error) => finish(new TelegramTransportError(
            proxySocketErrorCode(error),
            "proxy_connect",
            underlyingErrorCode(error),
            error.name,
        )));
        const sendConnect = () => {
            const authorization = Buffer.from(`${this.proxy.username}:${this.proxy.password}`, "utf8").toString("base64");
            proxySocket.write(
                `CONNECT ${TELEGRAM_HOST}:443 HTTP/1.1\r\n` +
                `Host: ${TELEGRAM_HOST}:443\r\n` +
                `Proxy-Authorization: Basic ${authorization}\r\n\r\n`,
            );
        };
        proxySocket.once(this.proxy.protocol === "https" ? "secureConnect" : "connect", sendConnect);

        let response = Buffer.alloc(0);
        const onData = (chunk: Buffer) => {
            response = Buffer.concat([response, chunk]);
            const headerEnd = response.indexOf("\r\n\r\n");
            if (headerEnd === -1) {
                if (response.length > 16_384) proxySocket.destroy(new TelegramTransportError("telegram_proxy_invalid_response", "proxy_connect"));
                return;
            }

            proxySocket.off("data", onData);
            const statusLine = response.subarray(0, response.indexOf("\r\n")).toString("ascii");
            if (/^HTTP\/1\.[01] 407(?: |$)/.test(statusLine)) {
                proxySocket.destroy();
                finish(new TelegramTransportError("telegram_proxy_auth_failed", "proxy_connect"));
                return;
            }
            if (!/^HTTP\/1\.[01] 200(?: |$)/.test(statusLine)) {
                proxySocket.destroy();
                finish(new TelegramTransportError("telegram_proxy_connect_failed", "proxy_connect"));
                return;
            }

            const tunneledBytes = response.subarray(headerEnd + 4);
            if (tunneledBytes.length > 0) proxySocket.unshift(tunneledBytes);

            const telegramSocket = tls.connect({
                socket: proxySocket,
                servername: TELEGRAM_HOST,
            });
            telegramSocket.once("secureConnect", () => finish(null, telegramSocket));
            telegramSocket.once("error", (error) => finish(new TelegramTransportError(
                "telegram_proxy_tls_failed",
                "tls",
                underlyingErrorCode(error),
                error.name,
            )));
        };
        proxySocket.on("data", onData);

        // Returning a socket would make Agent treat the proxy TCP connection as
        // the destination TLS socket before CONNECT has completed. Completion is
        // deliberately asynchronous through the callback above.
        return undefined as unknown as Duplex;
    }
}

function socksProxyAgent(proxy: ProxyConfiguration, timeoutMs: number): SocksProxyAgent {
    const proxyUrl = new URL("socks5h://proxy.invalid");
    proxyUrl.hostname = proxy.host;
    proxyUrl.port = String(proxy.port);
    proxyUrl.username = proxy.username;
    proxyUrl.password = proxy.password;
    return new SocksProxyAgent(proxyUrl, { timeout: timeoutMs });
}

function classifySocksError(error: unknown): TelegramTransportError {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const name = error instanceof Error ? error.name : undefined;
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (code === "ETIMEDOUT" || message.includes("timed out") || message.includes("timeout")) {
        return new TelegramTransportError("telegram_proxy_tcp_timeout", "proxy_connect", code || undefined, name);
    }
    if (message.includes("authentication") || message.includes("no accepted auth")) {
        return new TelegramTransportError("telegram_proxy_auth_failed", "proxy_connect", code || undefined, name);
    }
    if (code.startsWith("ERR_TLS") || code.includes("CERT") || message.includes("tls") || message.includes("ssl")) {
        return new TelegramTransportError("telegram_proxy_tls_failed", "tls", code || undefined, name);
    }
    return new TelegramTransportError("telegram_proxy_connect_failed", "proxy_connect", code || undefined, name);
}

export async function sendTelegramRequest(
    token: string,
    body: Record<string, unknown>,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<TelegramRequestResult> {
    const proxy = readProxyConfiguration();
    const transport = transportMode(proxy);
    const path = `/bot${token}/sendMessage`;

    if (!proxy) {
        const response = await fetch(`https://${TELEGRAM_HOST}${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeoutMs),
            cache: "no-store",
        });
        const responseBody = response.ok ? "" : (await response.text()).slice(0, MAX_TELEGRAM_ERROR_BODY_BYTES);
        return {
            ok: response.ok,
            status: response.status,
            transport,
            ...(!response.ok ? {
                telegramError: parseTelegramApiError(responseBody, [token]),
            } : {}),
        };
    }

    const agent: https.Agent = proxy.protocol === "socks5"
        ? socksProxyAgent(proxy, timeoutMs) as unknown as https.Agent
        : new TelegramHttpsProxyAgent(proxy, timeoutMs);
    const serializedBody = JSON.stringify(body);
    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: TELEGRAM_HOST,
            port: "443",
            path,
            method: "POST",
            headers: {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(serializedBody),
            },
            agent,
        }, (response) => {
            const status = response.statusCode ?? 0;
            const ok = status >= 200 && status < 300;
            const chunks: Buffer[] = [];
            let capturedBytes = 0;
            response.on("data", (chunk: Buffer) => {
                if (ok || capturedBytes >= MAX_TELEGRAM_ERROR_BODY_BYTES) return;
                const remaining = MAX_TELEGRAM_ERROR_BODY_BYTES - capturedBytes;
                const captured = chunk.subarray(0, remaining);
                chunks.push(captured);
                capturedBytes += captured.length;
            });
            response.once("end", () => {
                agent.destroy();
                const diagnosticSecrets = [token, proxy.username, proxy.password];
                resolve({
                    ok,
                    status,
                    transport,
                    ...(!ok ? {
                        telegramError: parseTelegramApiError(Buffer.concat(chunks).toString("utf8"), diagnosticSecrets),
                    } : {}),
                });
            });
        });
        request.setTimeout(timeoutMs, () => request.destroy(new TelegramTransportError("telegram_api_timeout", "telegram_request")));
        request.once("error", (error) => {
            agent.destroy();
            reject(error instanceof TelegramTransportError
                ? error
                : proxy.protocol === "socks5"
                    ? classifySocksError(error)
                    : new TelegramTransportError(
                        "telegram_request_failed",
                        "telegram_request",
                        underlyingErrorCode(error),
                        error.name,
                    ));
        });
        request.end(serializedBody);
    });
}
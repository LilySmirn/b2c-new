import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import type { ClientRequestArgs } from "node:http";
import type { Duplex } from "node:stream";
import { SocksProxyAgent } from "socks-proxy-agent";

const TELEGRAM_HOST = "api.telegram.org";
const DEFAULT_TIMEOUT_MS = 10_000;

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
    constructor(public readonly code: string) {
        super(code);
        this.name = "TelegramTransportError";
    }
}

export function getTelegramSafeErrorCode(error: unknown): string {
    if (error instanceof TelegramProxyConfigurationError || error instanceof TelegramTransportError) {
        return error.message;
    }
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
        return "telegram_api_timeout";
    }
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
            proxySocket.destroy(new TelegramTransportError("telegram_proxy_tcp_timeout"));
        });
        proxySocket.once("error", (error) => finish(new TelegramTransportError(proxySocketErrorCode(error))));
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
                if (response.length > 16_384) proxySocket.destroy(new TelegramTransportError("telegram_proxy_invalid_response"));
                return;
            }

            proxySocket.off("data", onData);
            const statusLine = response.subarray(0, response.indexOf("\r\n")).toString("ascii");
            if (/^HTTP\/1\.[01] 407(?: |$)/.test(statusLine)) {
                proxySocket.destroy();
                finish(new TelegramTransportError("telegram_proxy_auth_failed"));
                return;
            }
            if (!/^HTTP\/1\.[01] 200(?: |$)/.test(statusLine)) {
                proxySocket.destroy();
                finish(new TelegramTransportError("telegram_proxy_connect_failed"));
                return;
            }

            const tunneledBytes = response.subarray(headerEnd + 4);
            if (tunneledBytes.length > 0) proxySocket.unshift(tunneledBytes);

            const telegramSocket = tls.connect({
                socket: proxySocket,
                servername: TELEGRAM_HOST,
            });
            telegramSocket.once("secureConnect", () => finish(null, telegramSocket));
            telegramSocket.once("error", () => finish(new TelegramTransportError("telegram_proxy_tls_failed")));
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
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (code === "ETIMEDOUT" || message.includes("timed out") || message.includes("timeout")) {
        return new TelegramTransportError("telegram_proxy_tcp_timeout");
    }
    if (message.includes("authentication") || message.includes("no accepted auth")) {
        return new TelegramTransportError("telegram_proxy_auth_failed");
    }
    if (code.startsWith("ERR_TLS") || code.includes("CERT") || message.includes("tls") || message.includes("ssl")) {
        return new TelegramTransportError("telegram_proxy_tls_failed");
    }
    return new TelegramTransportError("telegram_proxy_connect_failed");
}

export async function sendTelegramRequest(
    token: string,
    body: Record<string, unknown>,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ ok: boolean; status: number; transport: TelegramTransportMode }> {
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
        return { ok: response.ok, status: response.status, transport };
    }

    const agent: https.Agent = proxy.protocol === "socks5"
        ? socksProxyAgent(proxy, timeoutMs) as unknown as https.Agent
        : new TelegramHttpsProxyAgent(proxy, timeoutMs);
    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: TELEGRAM_HOST,
            port: "443",
            path,
            method: "POST",
            headers: { "content-type": "application/json" },
            agent,
        }, (response) => {
            response.resume();
            response.once("end", () => {
                agent.destroy();
                const status = response.statusCode ?? 0;
                resolve({ ok: status >= 200 && status < 300, status, transport });
            });
        });
        request.setTimeout(timeoutMs, () => request.destroy(new TelegramTransportError("telegram_api_timeout")));
        request.once("error", (error) => {
            agent.destroy();
            reject(error instanceof TelegramTransportError
                ? error
                : proxy.protocol === "socks5"
                    ? classifySocksError(error)
                    : new TelegramTransportError("telegram_request_failed"));
        });
        request.end(JSON.stringify(body));
    });
}
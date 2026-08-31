import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const paymentLogDirectory = path.join(process.cwd(), "runtime-logs");
const paymentLogFile = path.join(paymentLogDirectory, "payment-events.jsonl");
const redactedValue = "[REDACTED]";
const sensitiveKeyPattern = /authorization|api[_-]?key|secret|cookie|session[_-]?token|password|credentials?/i;

function redactCredentials(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redactCredentials);
    }

    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                sensitiveKeyPattern.test(key) ? redactedValue : redactCredentials(nestedValue),
            ]),
        );
    }

    return value;
}

/**
 * Appends a technical payment event to the server-side JSONL log.
 * Logging is best-effort and never rejects, so it cannot interrupt payment handling.
 */
export async function logPaymentEvent(
    event: string,
    paymentId: string | null,
    webhookBody: unknown | null,
): Promise<void> {
    try {
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            paymentId,
            webhookBody: redactCredentials(webhookBody),
        };

        await mkdir(paymentLogDirectory, { recursive: true });
        await appendFile(paymentLogFile, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
        console.error("Could not append payment event to JSONL log", error);
    }
}
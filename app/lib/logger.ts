import db from './db';
import { sendTelegramMessage } from './telegram';
import { ErrorType } from "@/app/types/ErrorType";
import { NextResponse } from "next/server";

type LogLevel = 'ERROR' | 'WARNING' | 'INFO';

/**
 * Универсальная функция логирования ошибок API/сервера
 */
export async function logError(
    eventName: string,
    err: unknown,
    userId?: string | null,
    source = 'API'
) {
    const database = new db();

    let message = 'Unknown error';
    let stacktrace: string | null = null;

    if (err instanceof Error) {
        message = err.message;
        stacktrace = err.stack ?? null;
    } else if (typeof err === 'string') {
        message = err;
    } else {
        try {
            message = JSON.stringify(err);
        } catch {
            message = String(err);
        }
    }

    const level = 'ERROR';

    await database.logEvent({
        level,
        source,
        event_name: eventName,
        message,
        stacktrace,
        user_id: userId ?? null,
    });

    const text = `⚠️ *${level}*\n` +
        `*Event:* ${eventName}\n` +
        `*Message:* ${message}\n` +
        (userId ? `*User:* ${userId}\n` : '') +
        (stacktrace ? `*Stack:*\n\`${stacktrace.slice(0, 1000)}\`` : '');

    await sendTelegramMessage(text);
}

export async function logInfo(
    eventName: string,
    message: string,
    userId?: string | null,
    source = 'API'
) {
    const database = new db();

    await database.logEvent({
        level: 'INFO',
        source,
        event_name: eventName,
        message,
        stacktrace: null,
        user_id: userId ?? null,
    });
}

export async function NextErrorResponse(errorType: ErrorType, errorMessage: any, statusCode: number, userId: string | null): Promise<NextResponse> {
    await logError(errorType, errorMessage, userId);
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
}

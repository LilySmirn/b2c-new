import db from './db';

type LogLevel = 'ERROR' | 'WARNING' | 'INFO';

/**
 * Универсальная функция логирования ошибок API/сервера
 */
// TODO: change arguments order (eventName first), review arguments
export async function logError(
    err: unknown,
    eventName: string,
    userId?: string | null,
    level: LogLevel = 'ERROR',
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

    await database.logEvent({
        level,
        source,
        event_name: eventName,
        message,
        stacktrace,
        user_id: userId ?? null,
    });
}

export async function logInfo(
    eventName: string,
    message: string,
    userId?: string | null,
    level: LogLevel = 'INFO',
    source = 'API'
) {
    const database = new db();

    await database.logEvent({
        level,
        source,
        event_name: eventName,
        message,
        stacktrace: null,
        user_id: userId ?? null,
    });
}

import { Dispatch, SetStateAction } from 'react';

interface SafeTryOptions {
    setErrorMsg?: Dispatch<SetStateAction<string>>;
    setShowError?: Dispatch<SetStateAction<boolean>>;
}

export async function safeTry<T>(
    fn: () => Promise<T>,
    options?: SafeTryOptions,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (err: any) {
        console.error('Client error caught by safeTry:', err);

        if (options?.setErrorMsg) options.setErrorMsg(err.message || 'При взаимодействии с сервером произошла ошибка');
        if (options?.setShowError) options.setShowError(true);

        try {
            await fetch('/api/sendErrorToTelegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `${err.message}\n${err.stack ?? ''}`,
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                }),
            });
        } catch (e) {
            console.error('Не удалось отправить ошибку в Telegram', e);
        }

        return fallback;
    }
}

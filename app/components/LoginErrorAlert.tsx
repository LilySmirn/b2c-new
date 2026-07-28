'use client';

import { useEffect, useState } from 'react';
import ErrorModal from './ErrorModal';

export default function LoginErrorAlert() {
    const [showError, setShowError] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');

        if (error === 'invalid') {
            setErrorMsg('Неверный email или пароль.');
            setShowError(true);
        } else if (error === 'missing') {
            setErrorMsg('Пожалуйста, заполните все поля.');
            setShowError(true);
        } else if (error === 'session-replaced') {
            setErrorMsg('Сеанс завершён: в ваш аккаунт вошли с нового устройства. Если это были не вы, смените пароль.');
            setShowError(true);

            // Consume the one-time reason without reloading the page. This keeps a
            // later refresh or client-side remount from showing the notification
            // for a session that has already been handled.
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
        }
    }, []);

    return showError ? (
        <ErrorModal
            message={errorMsg}
            onClose={() => setShowError(false)}
            redirectOnClose={false}
            reportToTelegram={false}
        />
    ) : null;
}
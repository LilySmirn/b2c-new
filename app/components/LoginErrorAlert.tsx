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
        }
    }, []);

    return showError ? (
        <ErrorModal message={errorMsg} onClose={() => setShowError(false)} />
    ) : null;
}

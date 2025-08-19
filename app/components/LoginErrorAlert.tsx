'use client';

import { useEffect } from 'react';

export default function LoginErrorAlert() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');

        if (error === 'invalid') {
            alert('Неверный email или пароль.');
        } else if (error === 'missing') {
            alert('Пожалуйста, заполните все поля.');
        }
    }, []);

    return null;
}

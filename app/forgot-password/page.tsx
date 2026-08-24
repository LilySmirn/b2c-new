'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import styles from '../styles/auth.module.css';

const SUCCESS_MESSAGE = 'Если аккаунт с таким email существует, мы отправили письмо со ссылкой для восстановления пароля.';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
        return () => window.clearTimeout(timer);
    }, [countdown]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json().catch(() => null);
            if (response.ok || response.status === 429) {
                setMessage(SUCCESS_MESSAGE);
                setCountdown(Number(data?.retryAfterSeconds) || 60);
            } else {
                setError(data?.error || 'Не удалось отправить письмо. Попробуйте позже');
            }
        } catch {
            setError('Ошибка сети. Попробуйте позже');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className={styles.mainLogin}>
            <section className={styles.breadCrumbs}><Link href="/login" className={`${styles.btn} ${styles.btnToMainPage}`}>← Вернуться ко входу</Link></section>
            <section className={`${styles.loginFormSection} ${styles.recoverySection}`}>
                <form onSubmit={submit} className={`${styles.loginForm} ${styles.recoveryForm}`}>
                    <h2>Восстановление пароля</h2>
                    <p className={styles.recoveryHint}>Укажите email, который используется для входа.</p>
                    <div className={styles.loginFormGroup}>
                        <div className={styles.inputWrapper}>
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" required />
                        </div>
                        {message && <p className={styles.recoverySuccess} role="status">{message}</p>}
                        {error && <p className={styles.recoveryError} role="alert">{error}</p>}
                        <button type="submit" className={styles.btnLoginPage} disabled={submitting || countdown > 0}>
                            {countdown > 0 ? `Отправить повторно через ${countdown} сек.` : submitting ? 'Отправка…' : 'Восстановить пароль'}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
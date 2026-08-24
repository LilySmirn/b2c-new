'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import styles from '../styles/auth.module.css';

export default function ResetPasswordClient({ token }: { token: string }) {
    const [validity, setValidity] = useState<'checking' | 'valid' | 'invalid'>('checking');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) { setValidity('invalid'); return; }
        fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
            .then((response) => setValidity(response.ok ? 'valid' : 'invalid'))
            .catch(() => setValidity('invalid'));
    }, [token]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        if (password !== confirmation) { setError('Пароли не совпадают'); return; }
        if (password.length < 6) { setError('Пароль должен содержать не менее 6 символов'); return; }
        setSubmitting(true);
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await response.json().catch(() => null);
            if (response.ok) setSuccess(true);
            else if (response.status === 400 && data?.error?.startsWith('Ссылка')) setValidity('invalid');
            else setError(data?.error || 'Не удалось изменить пароль');
        } catch { setError('Ошибка сети. Попробуйте позже'); }
        finally { setSubmitting(false); }
    }

    if (validity === 'checking') return <main className={styles.recoveryResult}><p>Проверяем ссылку…</p></main>;
    if (validity === 'invalid') return <main className={styles.recoveryResult}><h1>Ссылка недействительна</h1><p>Ссылка для восстановления пароля недействительна или срок её действия истёк.</p><Link className={styles.verifyButton} href="/forgot-password">Запросить новую ссылку</Link></main>;
    if (success) return <main className={styles.recoveryResult}><h1>Пароль успешно изменён.</h1><p>Теперь вы можете войти с новым паролем.</p><Link className={styles.verifyButton} href="/login">Войти</Link></main>;

    return <main className={styles.mainLogin}>
        <section className={`${styles.loginFormSection} ${styles.recoverySection}`}>
            <form onSubmit={submit} className={`${styles.loginForm} ${styles.recoveryForm}`}>
                <h2>Создание нового пароля</h2>
                <div className={`${styles.loginFormGroup} ${styles.recoveryFields}`}>
                    <div className={styles.inputWrapper}>
                        <input type="password" 
                        value={password} 
                        onChange={(event) => setPassword(event.target.value)} 
                        placeholder="Новый пароль" 
                        autoComplete="new-password" 
                        required minLength={6} 
                        />
                        </div>
                        <div className={styles.inputWrapper}>
                            <input type="password" 
                            value={confirmation} 
                            onChange={(event) => setConfirmation(event.target.value)} 
                            placeholder="Повторите новый пароль" 
                            autoComplete="new-password" required minLength={6} 
                            />
                            </div>
                            {error && <p className={styles.recoveryError} role="alert">{error}</p>}
                            <button className={styles.btnLoginPage} 
                            disabled={submitting}>{submitting ? 'Сохранение…' : 'Сохранить новый пароль'}
                            </button>
                        </div>
                </form>
        </section>
    </main>;
}

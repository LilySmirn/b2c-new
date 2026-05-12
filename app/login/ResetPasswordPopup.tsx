'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/auth.module.css';

export default function ResetPasswordPopup() {
    const [show, setShow] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    function handleOpen() {
        setShow(true);
        setStatus('idle');
        setEmail('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch('/forgot-password/api', {
            method: 'POST',
            body: JSON.stringify({ email }),
            headers: { 'Content-Type': 'application/json' },
        });
        setStatus(res.ok ? 'sent' : 'error');
    }

    const button = (
        <button
            type="button"
            onClick={handleOpen}
            className={styles.forgotPassword}
        >
            Забыли пароль?
        </button>
    );

    const modal = (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3>Сброс пароля</h3>
                {status === 'sent' ? (
                    <p>Новый пароль отправлен на email.</p>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Ваш email"
                            required
                        />
                        <div className={styles.modalActions}>
                            <button type="submit">Отправить</button>
                            <button type="button" onClick={() => setShow(false)}>Отмена</button>
                        </div>
                        {status === 'error' && (
                            <p style={{ color: 'red' }}>Ошибка. Попробуйте ещё раз.</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );

    return (
        <>
            {button}
            {mounted && show && createPortal(modal, document.body)}
        </>
    );
}

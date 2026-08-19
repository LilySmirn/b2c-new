'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './profile.module.css';

type ModalType = 'name' | 'login' | 'password';

export default function ProfileModalController({ onUserUpdate }: { onUserUpdate: (u: any) => void }) {
    const [modalType, setModalType] = useState<ModalType | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const inputsRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    const openModal = (type: ModalType) => {
        setModalType(type);
        setEmailSent(false);
        renderFields(type);
        if (overlayRef.current) overlayRef.current.style.display = 'flex';
    };

    const closeModal = () => {
        if (overlayRef.current) overlayRef.current.style.display = 'none';
        setError('');

        window.location.reload();
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        const body: any = {};

        if (modalType === 'name') {
            const fullName = (document.getElementById('fullNameInput') as HTMLInputElement)?.value;
            if (fullName?.trim()) body.name = fullName.trim();
        }

        if (modalType === 'login') {
            const login = (document.getElementById('loginInput') as HTMLInputElement)?.value;
            if (login?.trim()) body.login = login.trim();
        }

        if (modalType === 'password') {
            const password = (document.getElementById('modalInput') as HTMLInputElement)?.value;
            const confirm = (document.getElementById('confirmPasswordInput') as HTMLInputElement)?.value;
            if (password !== confirm) {
                setError('Пароли не совпадают');
                setLoading(false);
                return;
            }
            if (password?.trim()) body.password = password.trim();
        }

        try {
            const isEmailChange = modalType === 'login';
            const res = await fetch(isEmailChange ? '/api/profile/email-change' : '/api/update-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEmailChange ? { email: body.login } : body),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Ошибка при обновлении данных');
            }

            if (isEmailChange) {
                setEmailSent(true);
                return;
            }

            if (data.user) {
                onUserUpdate(data.user);
            }

            closeModal();
        } catch (err: any) {
            setError(err.message || 'Ошибка при обновлении данных');
        } finally {
            setLoading(false);
        }
    };

    const renderFields = (type: ModalType) => {
        if (!inputsRef.current || !titleRef.current) return;

        switch (type) {
            case 'name':
                titleRef.current.textContent = 'Изменить имя и фамилию';
                inputsRef.current.innerHTML = `
                    <input type="text" id="fullNameInput" class="${styles.modalInput}" placeholder="Введите новые данные" />
                `;
                break;
            case 'login':
                titleRef.current.textContent = 'Изменить email';
                inputsRef.current.innerHTML = `
                    <input type="text" id="loginInput" class="${styles.modalInput}" placeholder="Введите новые данные" />
                `;
                break;
            case 'password':
                titleRef.current.textContent = 'Изменение пароля';
                inputsRef.current.innerHTML = `
                    <div class="${styles.passwordField}">
                        <input type="password" id="modalInput" class="${styles.modalInput}" placeholder="Введите пароль" />
                    </div>
                    <div class="${styles.passwordField}">
                        <input type="password" id="confirmPasswordInput" class="${styles.modalInput}" placeholder="Повторите пароль" />
                    </div>
                `;
                break;
        }
    };

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            const modalTypeAttr = target.getAttribute('data-modal') as ModalType;
            if (modalTypeAttr) {
                openModal(modalTypeAttr);
                return;
            }

            if (overlayRef.current && target === overlayRef.current) {
                closeModal();
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className={styles.modalOverlay} ref={overlayRef} style={{ display: 'none' }}>
            <div
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
            >
                <button
                    type="button"
                    className={styles.modalClose}
                    onClick={closeModal}
                    aria-label="Закрыть окно"
                >
                    ×
                </button>

                <div className={styles.modalHeader}>
                    <h2 id="profile-modal-title" ref={titleRef}>Введите новое значение</h2>
                    <p>{emailSent
                        ? 'Мы отправили на вашу почту письмо со ссылкой для подтверждения нового email.'
                        : 'Укажите новые данные и сохраните изменения.'}</p>
                </div>

                {!emailSent && <div className={styles.modalInputs} ref={inputsRef}></div>}

                {!emailSent && error && <div className={styles.modalError}>{error}</div>}

                <div className={styles.modalButtons}>
                    {emailSent ? (
                        <button onClick={closeModal} className={styles.changeBtn}>ОК</button>
                    ) : (
                        <>
                            <button onClick={closeModal} className={styles.cancelBtn}>Отмена</button>
                            <button onClick={handleSubmit} disabled={loading} className={styles.changeBtn}>
                                {loading ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './profile.module.css';
import {useRouter} from "next/navigation";

type ModalType = 'name' | 'login' | 'password';

export default function ProfileModalController({ onUserUpdate }: { onUserUpdate: (u: any) => void }) {
    const [modalType, setModalType] = useState<ModalType | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const inputsRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const openModal = (type: ModalType) => {
        setModalType(type);
        renderFields(type);
        if (overlayRef.current) overlayRef.current.style.display = 'block';
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
            const res = await fetch('/api/update-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Ошибка при обновлении данных');
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
                titleRef.current.textContent = 'Изменение имени';
                inputsRef.current.innerHTML = `
                    <input type="text" id="fullNameInput" class="${styles.modalInput}" placeholder="Введите имя и фамилию" />
                `;
                break;
            case 'login':
                titleRef.current.textContent = 'Изменение логина';
                inputsRef.current.innerHTML = `
                    <input type="text" id="loginInput" class="${styles.modalInput}" placeholder="Введите логин (почту)" />
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
            <div className={styles.modal}>
                <div className={styles.modalClose} onClick={closeModal}>
                    <img src="/images/popup-exit.png" alt="close" />
                </div>

                <div className={styles.modalHeader} ref={titleRef}>Введите новое значение</div>

                <div id="modalInputs" ref={inputsRef}></div>

                {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}

                <div className={styles.modalButtons}>
                    <button onClick={handleSubmit} disabled={loading} className={styles.changeBtn}>
                        {loading ? 'Сохранение...' : 'Изменить'}
                    </button>
                    <button onClick={closeModal} className={styles.cancelBtn}>Отмена</button>
                </div>
            </div>
        </div>
    );
}

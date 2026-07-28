'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ErrorModal.module.css';

interface ErrorModalProps {
    message?: string;
    onClose?: () => void;
    redirectOnClose?: boolean;
    reportToTelegram?: boolean;
}

export default function ErrorModal({
    message,
    onClose,
    redirectOnClose = true,
    reportToTelegram = true,
}: ErrorModalProps) {
    const router = useRouter();

    useEffect(() => {
        if (!reportToTelegram) {
            return;
        }

        const sendError = async () => {
            try {
                await fetch('/api/sendErrorToTelegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: message || 'Неизвестная ошибка',
                    }),
                });
            } catch (err) {
                console.error('Не удалось отправить ошибку в телеграм', err);
            }
        };
        sendError();
    }, [message, reportToTelegram]);

    const handleOk = () => {
        onClose?.();

        if (redirectOnClose) {
            router.push('/');
        }
    };

    return (
        <div className={styles.errorOverlay}>
            <div className={styles.errorModal}>
                <h2>При взаимодействии с сервером произошла ошибка</h2>
                <p>{message || 'Попробуйте ещё раз.'}</p>
                <button className={styles.okBtn} onClick={handleOk}>
                    Ок
                </button>
            </div>
        </div>
    );
}

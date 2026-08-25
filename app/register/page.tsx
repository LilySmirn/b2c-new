'use client';

import styles from '../styles/auth.module.css';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type RegistrationStatus =
    | 'already_verified'
    | 'verification_pending'
    | 'verification_resent'
    | 'verification_sent';

const registrationResult: Record<RegistrationStatus, { title: string; message: string }> = {
    already_verified: {
        title: 'Аккаунт уже существует',
        message: 'Аккаунт с таким email уже существует. Войдите в личный кабинет.',
    },
    verification_pending: {
        title: 'Проверьте почту',
        message: 'Пользователь уже зарегистрирован. Проверьте почту и подтвердите email по ссылке из письма. Ссылка для подтверждения действует 24 часа с момента отправки.',
    },
    verification_resent: {
        title: 'Проверьте почту',
        message: 'Мы отправили вам на почту новое письмо для подтверждения email.',
    },
    verification_sent: {
        title: 'Проверьте почту',
        message: 'Мы отправили вам на почту письмо для подтверждения email.',
    },
};

function isRegistrationStatus(value: unknown): value is RegistrationStatus {
    return typeof value === 'string' && value in registrationResult;
}

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);

    const router = useRouter();

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Введите имя');
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert('Введите корректный email');
            return;
        }

        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                alert(data?.error || 'Ошибка регистрации');
                return;
            }

            if (!isRegistrationStatus(data?.status)) {
                alert('Получен неизвестный ответ сервера');
                return;
            }

            setRegistrationStatus(data.status);

        } catch (err) {
            console.error(err);
            alert('Ошибка сети');
            } finally {
            setIsSubmitting(false);
        }
    };

    const closeSuccessPopup = () => {
        setRegistrationStatus(null);
        router.push('/login');
    };

    return (
        <div className={styles.pageWrapper}>
            <div id="header"></div>

            <div className={styles.mainReg}>
                <section className={styles.breadCrumbs}>
                    <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                        ← На главную страницу
                    </Link>
                </section>

                <section className={styles.regFormSection}>
                    <form className={styles.regForm} onSubmit={handleRegister}>
                        <h2>Регистрация</h2>
                        <div className={styles.regFormGroup}>
                            <div className={styles.regFormInput}>

                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        placeholder="Введите имя*"
                                        required
                                        autoComplete="given-name"
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className={styles.inputWrapper}>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="Введите email*"
                                        required
                                        autoComplete="username"
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className={`${styles.inputWrapper} ${styles.inputGroup}`}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        placeholder="Введите пароль*"
                                        required
                                        autoComplete="new-password"
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.togglePassword}
                                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? (
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                                                <circle cx="12" cy="12" r="2.5" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                                                <circle cx="12" cy="12" r="2.5" />
                                                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                <div className={`${styles.inputWrapper} ${styles.inputGroup}`}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="passwordConfirm"
                                        placeholder="Повторите пароль*"
                                        required
                                        autoComplete="new-password"
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className={styles.togglePassword}
                                        aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    >
                                        {showConfirmPassword ? (
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                                                <circle cx="12" cy="12" r="2.5" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24">
                                                <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                                                <circle cx="12" cy="12" r="2.5" />
                                                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className={`${styles.checkboxRemember} ${styles.checkboxRememberReg}`}>
                                <div className={`${styles.checkboxWrapper} ${styles.checkboxContainer}`}>
                                    <input type="checkbox" id="remember" name="remember" required />
                                    <label htmlFor="remember">Согласие на обработку персональных данных</label>
                                </div>
                                <div className={`${styles.checkboxWrapper} ${styles.checkboxContainer}`}>
                                    <input type="checkbox" id="remember-reg" name="remember-reg" required />
                                    <label htmlFor="remember-reg">Согласие с политикой конфиденциальности</label>
                                </div>
                            </div>

                            <button type="submit" className={styles.btnLoginPage} disabled={isSubmitting}>
                                {isSubmitting ? 'Регистрация…' : 'Зарегистрироваться'}
                            </button>

                            <div className={styles.signupText}>
                                Уже есть аккаунт?
                                <br />
                                <Link href="/login" className={styles.btnCreate}>
                                    Войдите
                                </Link>
                            </div>
                        </div>
                    </form>
                </section>
            </div>
            <div id="footer"></div>
            {registrationStatus && (
                <div className={styles.successPopupOverlay}>
                    <section
                        className={styles.successPopup}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="registration-success-title"
                        aria-describedby="registration-success-description"
                    >
                        <h2 id="registration-success-title">{registrationResult[registrationStatus].title}</h2>
                        <p id="registration-success-description">
                            {registrationResult[registrationStatus].message}
                        </p>
                        {registrationStatus === 'already_verified' ? (
                            <Link className={styles.successPopupButton} href="/login" autoFocus>
                                Войти
                            </Link>
                        ) : (
                            <button type="button" className={styles.successPopupButton} onClick={closeSuccessPopup} autoFocus>
                                Понятно
                            </button>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

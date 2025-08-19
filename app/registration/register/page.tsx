'use client';

import styles from '../../styles/auth.module.css';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const router = useRouter();

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!name.trim()) {
            alert('Введите имя и фамилию');
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

            router.push('/registration/success');

        } catch (err) {
            console.error(err);
            alert('Ошибка сети');
        }
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
                                        placeholder="Введите имя и фамилию*"
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
                                        placeholder="Введите емейл*"
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

                            <button type="submit" className={styles.btnLoginPage}>
                                Зарегистрироваться
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
        </div>
    );
}

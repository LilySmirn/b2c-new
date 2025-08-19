'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/auth.module.css';
import Link from 'next/link';
import LoginErrorAlert from '../components/LoginErrorAlert';

export default function Page() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (res?.ok) {
            router.push('/profile');
        } else {
            alert('Неверные данные');
        }
    };

    return (
        <div className={styles.mainLogin}>
            <LoginErrorAlert />

            <section className={styles.breadCrumbs}>
                <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                    ← На главную страницу
                </Link>
            </section>

            <section className={styles.loginFormSection}>
                <form onSubmit={handleLogin} className={styles.loginForm}>
                    <h2>Вход</h2>

                    <div className={styles.loginFormGroup}>
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

                        <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    placeholder="Введите пароль*"
                                    required
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className={styles.togglePassword}
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                                >
                                    {!showPassword ? (
                                        <svg viewBox="0 0 24 24" className={styles.icon}>
                                            <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                                            <circle cx="12" cy="12" r="2.5"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" className={styles.icon}>
                                            <path d="M2 2l20 20" stroke="currentColor" strokeWidth="2" />
                                            <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                                            <circle cx="12" cy="12" r="2.5"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className={styles.checkboxRemember}>
                            <div className={styles.checkboxRememberBlock}>
                                <div className={styles.checkboxWrapper}>
                                    <input type="checkbox" id="remember" name="remember" />
                                </div>
                                <label htmlFor="remember">Запомнить меня на этом компьютере</label>
                            </div>

                            <Link href="/forgot-password" className={styles.forgotPassword}>
                                Забыли пароль?
                            </Link>
                        </div>

                        <button type="submit" className={styles.btnLoginPage}>
                            Войти
                        </button>

                        <div className={styles.signupText}>
                            Впервые на сайте?
                            <br />
                            <Link href="/registration/register" className={styles.btnCreate}>
                                Создайте аккаунт
                            </Link>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    );
}

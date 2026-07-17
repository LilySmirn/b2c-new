'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './auth.module.css';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MIN_CREDENTIAL_LENGTH = 6;

function buildDirectoryUrl(code: string | null) {
  const params = code ? `?code=${encodeURIComponent(code)}` : '';

  return `/directory/search${params}`;
}

function setCredentialCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export default function AuthClient() {
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [code, setCode] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(
    () => isLoading || username.length < MIN_CREDENTIAL_LENGTH || password.length < MIN_CREDENTIAL_LENGTH,
    [isLoading, password.length, username.length]
  );

  useEffect(() => {
    usernameInputRef.current?.focus();
    setCode(new URLSearchParams(window.location.search).get('code'));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    setErrorText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/legacy-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = (await response.json()) as { result?: string };

      if (data.result === 'denyIP') {
        setErrorText('IP не зарегистрирован');
        return;
      }

      if (data.result === 'deny') {
        setErrorText('Неверный логин или пароль');
        return;
      }

      if (data.result === 'access') {
        setCredentialCookie('username', username);
        setCredentialCookie('password', password);
        window.location.href = buildDirectoryUrl(code);
        return;
      }

      setErrorText('Ошибка');
      console.log(data);
    } catch (error) {
      console.error('Ошибка:', error);
      setErrorText('Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.authPage}>
      {isLoading && (
        <div className={styles.loadingOverlay} role="status" aria-live="polite">
          <div className={styles.loadingPopup}>Проверяем доступ...</div>
        </div>
      )}

      <header className={styles.topBar}>
        <Link className={styles.logoMark} href="/" aria-label="На главную страницу">
          <Image
            src="/images/logo-white.png"
            alt="Клинические рекомендации Минздрава — логотип"
            width={75}
            height={30}
            priority
          />
        </Link>

        <Link className={styles.exitLink} href="/">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path opacity="0.85" d="M1.99999 0.352051C1.26499 0.352051 0.666992 0.950051 0.666992 1.68605V12.3521C0.666992 13.0881 1.26499 13.6861 1.99999 13.6861H9.99999C10.736 13.6861 11.334 13.0881 11.334 12.3521V9.18605L10.002 10.1841V12.3521H1.99999V1.68605H9.99999V3.85205L11.334 4.85205V1.68605C11.334 0.950051 10.736 0.352051 9.99999 0.352051H1.99999ZM8.66699 4.51905V6.35205H5.33399V7.68605H8.66699V9.51905L12 7.01905L8.66699 4.51905Z" fill="white" />
          </svg>
          <span>Выйти</span>
        </Link>
      </header>

      <section className={styles.authHero}>
        <div className={styles.loginCard} aria-labelledby="auth-title">
          <h1 id="auth-title" className={styles.logo}>EasyMed</h1>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <label className={styles.field} htmlFor="username">
              <span>Логин</span>
              <input
                ref={usernameInputRef}
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>

            <label className={styles.field} htmlFor="password">
              <span>Пароль</span>
              <span className={styles.passwordInputWrapper}>
                <input
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {isPasswordVisible ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7Zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.3 2 2 3.3l3 3C2.4 8.1 1 12 1 12s4 7 11 7c1.8 0 3.4-.4 4.8-1l3 3 1.3-1.3L3.3 2Zm8.7 15c-4.5 0-7.6-3.6-8.8-5 .7-1 1.8-2.3 3.3-3.3l2 2A4.5 4.5 0 0 0 13.3 15l2 2c-1 .3-2.1.5-3.3.5V17Zm9.8-5c-.7 1-1.8 2.3-3.3 3.3l-2-2A4.5 4.5 0 0 0 10.7 7l-1.6-1.6c.9-.2 1.9-.4 2.9-.4 7 0 11 7 11 7Z" fill="currentColor" />
                    </svg>
                  )}
                </button>
              </span>
            </label>

            {errorText && (
              <div className={styles.errorMessage} role="alert">
                {errorText}
              </div>
            )}

            <button className={styles.submitButton} type="submit" disabled={isSubmitDisabled}>
              Вход
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
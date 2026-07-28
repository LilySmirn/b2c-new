"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import UserIconClient from "./UserIconClient";

interface AuthButtonsClientProps {
    isLoggedIn: boolean;
    variant?: "header" | "footer";
}

export default function AuthButtonsClient({ isLoggedIn, variant = 'header' }: AuthButtonsClientProps) {
    const [hasActiveSession, setHasActiveSession] = useState(isLoggedIn);
    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';

        const checkSession = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/active-session', { cache: 'no-store' });

            if (!response.ok) {
                return;
            }

            const status = await response.json() as { isActive: boolean; wasReplaced: boolean };

            if (status.wasReplaced) {
                setHasActiveSession(false);
                window.location.replace('/login?error=session-replaced');
                return;
            }

            setHasActiveSession(status.isActive);
        } catch {
            // Keep the current UI during a temporary network failure.
        }
    }, []);

    useEffect(() => {
        if (variant !== 'header') {
            return;
        }

        void checkSession();

        const intervalId = window.setInterval(() => void checkSession(), 5_000);
        const checkVisibleSession = () => {
            if (document.visibilityState === 'visible') {
                void checkSession();
            }
        };

        window.addEventListener('focus', checkSession);
        document.addEventListener('visibilitychange', checkVisibleSession);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', checkSession);
            document.removeEventListener('visibilitychange', checkVisibleSession);
        };
    }, [checkSession, variant]);

    return (
        <div className="auth-buttons-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {hasActiveSession && (
                <Link href="/profile" aria-label="Личный кабинет" className="user-icon-link">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                </Link>
            )}

            {hasActiveSession ? (
                <LogoutButton className={loginClass} />
            ) : (
                <Link href="/login" className={loginClass}>Войти</Link>
            )}
        </div>
    );
}

"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import LogoutButton from "./LogoutButton";

interface AuthButtonsClientProps {
    isLoggedIn: boolean;
    variant?: "header" | "footer";
}

export default function AuthButtonsClient({ isLoggedIn, variant = 'header' }: AuthButtonsClientProps) {
    const pathname = usePathname();
    const [renderedPathname, setRenderedPathname] = useState<string | null>(null);
    const [hasActiveSession, setHasActiveSession] = useState(isLoggedIn);
    const isCheckingSession = useRef(false);
    const isHandlingReplacedSession = useRef(false);
    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';

        const checkSession = useCallback(async () => {
        if (isCheckingSession.current || isHandlingReplacedSession.current) {
            return;
        }

        isCheckingSession.current = true;
        
        try {
            const response = await fetch('/api/auth/active-session', { cache: 'no-store' });

            if (!response.ok) {
                return;
            }

            const status = await response.json() as { isActive: boolean; wasReplaced: boolean };

            if (status.wasReplaced) {
                isHandlingReplacedSession.current = true;
                setHasActiveSession(false);

                // The database session has already been revoked by the login on the
                // new device. Remove the stale NextAuth JWT as well; otherwise every
                // poll sees that same revoked session and redirects again.
                await signOut({ redirect: false });
                window.location.replace('/login?error=session-replaced');
                return;
            }

            setHasActiveSession(status.isActive);
        } catch {
            // Keep the current UI during a temporary network failure.
            } finally {
            isCheckingSession.current = false;
        }
    }, []);

    useEffect(() => {
        // The pathname available during SSR can differ from the browser pathname
        // (for example after a rewrite). Defer route-specific markup until after
        // hydration so React receives the same initial tree on both sides.
        setRenderedPathname(pathname);
    }, [pathname]);

    useEffect(() => {
        if (variant !== 'header') {
            return;
        }

        void checkSession();

        const checkVisibleSession = () => {
            if (document.visibilityState === 'visible') {
                void checkSession();
            }
        };

        window.addEventListener('focus', checkSession);
        document.addEventListener('visibilitychange', checkVisibleSession);

        return () => {
            window.removeEventListener('focus', checkSession);
            document.removeEventListener('visibilitychange', checkVisibleSession);
        };
    }, [checkSession, variant]);

    if (variant === 'header' && hasActiveSession) {
        return (
            <div className="auth-buttons-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {renderedPathname === '/profile' ? (
                    <LogoutButton className={loginClass} />
                ) : (
                    <Link href="/profile" className={loginClass}>Личный кабинет</Link>
                )}
            </div>
        );
    }

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

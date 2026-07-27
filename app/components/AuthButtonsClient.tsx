"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";
import UserIconClient from "./UserIconClient";

interface AuthButtonsClientProps {
    isLoggedIn: boolean;
    variant?: "header" | "footer";
}

export default function AuthButtonsClient({ isLoggedIn, variant = 'header' }: AuthButtonsClientProps) {
    const [hasSession, setHasSession] = useState(isLoggedIn);
    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';

        useEffect(() => {
        setHasSession(isLoggedIn);
    }, [isLoggedIn]);

    useEffect(() => {
        const handleLogin = () => setHasSession(true);

        window.addEventListener('b2c-login-success', handleLogin);
        return () => window.removeEventListener('b2c-login-success', handleLogin);
    }, []);

    return (
        <div className="auth-buttons-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            <UserIconClient isLoggedIn={hasSession} />

            {hasSession ? (
                <LogoutButton className={loginClass} />
            ) : (
                <Link href="/login" className={loginClass}>Войти</Link>
            )}
        </div>
    );
}

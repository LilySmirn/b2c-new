"use client";

import Link from "next/link";
import LogoutButton from "./LogoutButton";
import UserIconClient from "./UserIconClient";

interface AuthButtonsClientProps {
    isLoggedIn: boolean;
    variant?: "header" | "footer";
}

export default function AuthButtonsClient({ isLoggedIn, variant = 'header' }: AuthButtonsClientProps) {
    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';

    return (
        <div className="auth-buttons-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            <UserIconClient />

            {isLoggedIn ? (
                <LogoutButton className={loginClass} />
            ) : (
                <Link href="/login" className={loginClass}>Войти</Link>
            )}
        </div>
    );
}

"use client";

import Link from "next/link";
import LogoutButton from "./LogoutButton";

interface AuthButtonsClientProps {
    isLoggedIn: boolean;
    variant?: "header" | "footer";
}

export default function AuthButtonsClient({ isLoggedIn, variant = 'header' }: AuthButtonsClientProps) {
    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';

    return (
        <>
            {isLoggedIn ? (
                <LogoutButton className={loginClass} />
            ) : (
                <Link href="/login" className={loginClass}>Войти</Link>
            )}
        </>
    );
}

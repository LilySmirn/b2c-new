'use client';

import {signOut} from "next-auth/react";

interface LogoutButtonProps {
    className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
    return (
        <button onClick={() => signOut({ callbackUrl: '/login' })} className={className || 'btn btn-login btn-auth'}>
            Выйти
        </button>
    );
}

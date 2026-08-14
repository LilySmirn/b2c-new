'use client';

import { logout } from "../lib/logout";

interface LogoutButtonProps {
    className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
    return (
        <button onClick={logout} className={className || 'btn btn-login btn-auth'}>
            Выйти
        </button>
    );
}

'use client';

import { logoutB2c } from "../lib/b2cLogout";

interface LogoutButtonProps {
    className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
    return (
        <button onClick={logoutB2c} className={className || 'btn btn-login btn-auth'}>
            Выйти
        </button>
    );
}

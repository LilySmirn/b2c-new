import Link from 'next/link';
import LogoutButton from './LogoutButton';
import {getServerSession} from "next-auth";
import {authOptions} from "@/app/lib/auth";

interface AuthButtonsProps {
    variant?: 'header' | 'footer';
}

export default async function AuthButtons({ variant = 'header' }: AuthButtonsProps) {
    const session = await getServerSession(authOptions);
    const isLoggedIn = Boolean(session);

    const loginClass =
        variant === 'footer' ? 'btn footer-btn-login btn-auth' : 'btn btn-login btn-auth';
    const demoClass =
        variant === 'footer' ? 'btn footer-btn-demo' : 'btn btn-demo';

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

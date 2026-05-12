"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ErrorModal from "./ErrorModal";

export default function UserIconClient() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch("/api/auth/session");
                if (!res.ok) throw new Error("Ошибка при получении сессии");
                const data = await res.json();
                setIsLoggedIn(!!data?.user);
            } catch (err: any) {
                console.error(err);
                setErrorMsg("При взаимодействии с сервером произошла ошибка, попробуйте ещё раз.");
                setShowError(true);
            }
        };
        fetchSession();
    }, []);

    if (!isLoggedIn) return showError ? <ErrorModal message={errorMsg} onClose={() => setShowError(false)} /> : null;

    return (
        <>
            {showError && <ErrorModal message={errorMsg} onClose={() => setShowError(false)} />}
            <Link href="/profile" aria-label="Личный кабинет" className="user-icon-link">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
            </Link>
        </>
    );
}

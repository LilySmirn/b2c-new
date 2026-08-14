"use client";

import { getSession, signOut } from "next-auth/react";

type AccountType = "b2b" | "b2c";

export function getLogoutPath(accountType?: AccountType): "/auth" | "/login" {
    return accountType === "b2b" ? "/auth" : "/login";
}

export async function logout(): Promise<void> {
    const session = await getSession();
    const accountType = session?.user?.accountType;

    if (accountType === "b2c") {
        try {
            const response = await fetch("/api/auth/revoke-session", {
                method: "POST",
            });

            if (!response.ok) {
                console.error("Не удалось отозвать серверную сессию");
            }
        } catch {
            console.error("Не удалось отозвать серверную сессию");
        }
    }

    await signOut({ redirect: false });
    window.location.assign(getLogoutPath(accountType));
}
"use client";

import { signOut } from "next-auth/react";

export async function logoutB2c(): Promise<void> {
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

    await signOut({ callbackUrl: "/login" });
}
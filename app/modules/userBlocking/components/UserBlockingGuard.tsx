"use client";

import { useCallback, useEffect, useState } from "react";
import { USER_BLOCKING_REFRESH_EVENT, type UserBlockingStatus } from "../types";
import UserBlockedPopup from "@/app/modules/userBlocking/components/UserBlockedPopup";

const STATUS_URL = "/api/user-blocking/status";
const CHECK_INTERVAL_MS = 5_000;

/**
 * Application-wide block boundary.
 *
 * A blocked state is deliberately only cleared by a successful server response
 * with `blocked: false`; network failures cannot accidentally restore access.
 */
export default function UserBlockingGuard() {
    const [status, setStatus] = useState<UserBlockingStatus>({ blocked: false });

    const refreshStatus = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch(STATUS_URL, {
                cache: "no-store",
                credentials: "same-origin",
                signal,
            });

            if (response.status === 401) {
                setStatus({ blocked: false });
                return;
            }

            if (!response.ok) return;

            const nextStatus = (await response.json()) as UserBlockingStatus;
            setStatus(nextStatus);
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                console.error("Не удалось проверить блокировку пользователя", error);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void refreshStatus(controller.signal);

        const intervalId = window.setInterval(() => {
            void refreshStatus(controller.signal);
        }, CHECK_INTERVAL_MS);
        const handleFocus = () => void refreshStatus(controller.signal);
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") handleFocus();
        };

        window.addEventListener("focus", handleFocus);
        window.addEventListener(USER_BLOCKING_REFRESH_EVENT, handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            controller.abort();
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener(USER_BLOCKING_REFRESH_EVENT, handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [refreshStatus]);

    useEffect(() => {
        if (!status.blocked) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [status.blocked]);

    return (
        <UserBlockedPopup
            isOpen={status.blocked}
        />
    );
}
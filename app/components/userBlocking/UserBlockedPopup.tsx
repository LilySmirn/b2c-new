"use client";

import { useEffect, useId, useRef } from "react";
import type { UserBlockReasonCode } from "@/app/lib/userBlocking/types";
import { USER_BLOCK_REASON_CODES } from "@/app/lib/userBlocking/types";
import styles from "./UserBlockedPopup.module.css";

const REASON_MESSAGES: Record<UserBlockReasonCode, string> = {
    [USER_BLOCK_REASON_CODES.FREQUENT_UNIQUE_CLINICAL_RECOMMENDATION_REQUESTS]:
        "Мы заметили необычно частые обращения к разным клиническим рекомендациям.",
    [USER_BLOCK_REASON_CODES.EXCESSIVE_REQUESTS]:
        "Мы заметили необычно большое количество запросов с вашего аккаунта.",
};

export interface UserBlockedPopupProps {
    isOpen: boolean;
    reason?: UserBlockReasonCode | null;
    onClose?: () => void;
    supportHref?: string;
}

/**
 * Blocking notice UI. Detection and fetching the block state intentionally stay
 * outside this component so it can be connected to any request boundary later.
 */
export default function UserBlockedPopup({
    isOpen,
    reason = null,
    onClose,
    supportHref = "https://t.me/easymed_admin",
}: UserBlockedPopupProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && onClose) onClose();
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const reasonMessage = reason
        ? REASON_MESSAGES[reason]
        : "Мы временно ограничили доступ к аккаунту из-за подозрительной активности.";

    return (
        <div className={styles.overlay} role="presentation">
            <section
                ref={dialogRef}
                className={styles.dialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
            >
                {onClose && (
                    <button
                        className={styles.closeButton}
                        type="button"
                        aria-label="Закрыть уведомление"
                        onClick={onClose}
                    >
                        ×
                    </button>
                )}

                <div className={styles.icon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                        <rect x="4" y="10" width="16" height="11" rx="3" />
                        <path d="M12 14v3" />
                    </svg>
                </div>

                <h2 id={titleId}>Доступ временно ограничен</h2>
                <div id={descriptionId} className={styles.description}>
                    <p>{reasonMessage}</p>
                    <p>
                        Если вы считаете, что это произошло по ошибке, напишите нам —
                        мы проверим блокировку и поможем восстановить доступ.
                    </p>
                </div>

                <a
                    className={styles.supportLink}
                    href={supportHref}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Написать в поддержку
                </a>
            </section>
        </div>
    );
}
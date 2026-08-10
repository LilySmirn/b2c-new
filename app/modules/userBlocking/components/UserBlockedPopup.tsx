"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./UserBlockedPopup.module.css";

export interface UserBlockedPopupProps {
    isOpen: boolean;
    supportHref?: string;
}

/**
 * Blocking notice UI. Detection and fetching the block state intentionally stay
 * outside this component so it can be connected to any request boundary later.
 */
export default function UserBlockedPopup({
    isOpen,
    supportHref = "https://t.me/easymed_admin",
}: UserBlockedPopupProps) {
    const titleId = useId();
    const descriptionId = useId();
    const dialogRef = useRef<HTMLElement>(null);
    const supportLinkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();

        const keepFocusInsidePopup = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;

            event.preventDefault();
            supportLinkRef.current?.focus();
        };

        document.addEventListener("keydown", keepFocusInsidePopup);

        return () => {
            document.removeEventListener("keydown", keepFocusInsidePopup);
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

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
                <div className={styles.icon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                        <rect x="4" y="10" width="16" height="11" rx="3" />
                        <path d="M12 14v3" />
                    </svg>
                </div>

                <h2 id={titleId}>Доступ временно ограничен</h2>
                <div id={descriptionId} className={styles.description}>
                    <p>
                        Превышена частота запросов, свяжитесь с отделом
                        техподдержки.
                    </p>
                </div>

                <a
                    ref={supportLinkRef}
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
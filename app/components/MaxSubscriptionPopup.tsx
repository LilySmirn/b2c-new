"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import maxLogo from "@/assets/images/landing/Max_logo.svg";

const MAX_CHANNEL_URL = "https://max.ru/channel_easymed";
const MINIMUM_DOWNWARD_SCROLL = 160;

export default function MaxSubscriptionPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const hasOpened = useRef(false);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const openPopup = useCallback(() => {
        if (hasOpened.current) return;

        hasOpened.current = true;
        setIsOpen(true);
    }, []);

    const closePopup = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        let lastScrollPosition = window.scrollY;
        let furthestScrollPosition = window.scrollY;

        const handleScroll = () => {
            const currentScrollPosition = window.scrollY;
            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

            furthestScrollPosition = Math.max(furthestScrollPosition, currentScrollPosition);

            const reachedPageEnd = scrollableHeight > 0 && currentScrollPosition >= scrollableHeight - 8;
            const meaningfulScrollDistance = Math.max(MINIMUM_DOWNWARD_SCROLL, window.innerHeight * 0.2);
            const startedScrollingUp =
                furthestScrollPosition >= meaningfulScrollDistance &&
                currentScrollPosition < lastScrollPosition;

            if (reachedPageEnd || startedScrollingUp) openPopup();

            lastScrollPosition = currentScrollPosition;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [openPopup]);

    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add("noscroll");
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closePopup();
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.classList.remove("noscroll");
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [closePopup, isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="popup-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) closePopup();
            }}
        >
            <div
                className="call-popup max-subscription-popup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="max-subscription-title"
            >
                
                <div className="call-popup__text max-subscription-popup__text">
                    <span className="call-popup__eyebrow">10 дней бесплатно</span>
                    <h2 id="max-subscription-title">
                        Подпишись на наш канал в мессенджере MAX и получи бесплатный доступ без ограничений на 10 дней
                    </h2>
                </div>

                <a
                    className="popup__btn max-subscription-popup__button"
                    href={MAX_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Подписаться
                </a>

                <button
                    ref={closeButtonRef}
                    type="button"
                    className="call-popup__close"
                    onClick={closePopup}
                    aria-label="Закрыть предложение"
                >
                    <span aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
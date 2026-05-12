"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function HeaderMenuClient() {
    const [menuOpen, setMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    useEffect(() => {
        function handleEsc(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const href = e.currentTarget.getAttribute("href");
        if (href?.startsWith("#")) {
            e.preventDefault();
            const target = document.getElementById(href.slice(1));
            if (target) {
                target.scrollIntoView({ behavior: "smooth" });
            }
            setMenuOpen(false);
        }
    };

    return (
        <div className="mobile-nav">
            <button
                className={`burger-btn ${menuOpen ? "active" : ""}`}
                aria-label="Открыть меню"
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <span className="burger-line"></span>
                <span className="burger-line"></span>
                <span className="burger-line"></span>
            </button>

            <div
                ref={mobileMenuRef}
                className={`mobile-menu ${menuOpen ? "active" : ""}`}
            >
                <nav aria-label="Мобильное меню">
                    <ul className="mobile-menu-list">
                        <li><a href="#about" onClick={handleSmoothScroll}>О проекте</a></li>
                        <li><a href="#pricing" onClick={handleSmoothScroll}>Тарифы</a></li>
                        <li><a href="#video" onClick={handleSmoothScroll}>Видео-инструкция</a></li>
                        <li><a href="#contact" onClick={handleSmoothScroll}>Контакты</a></li>
                    </ul>
                </nav>
                <div className="mobile-buttons">
                    <Link href="/login" className="btn btn-login btn-auth">Войти</Link>
                </div>
            </div>

            {menuOpen && <div className="overlay active" onClick={() => setMenuOpen(false)} />}
        </div>
    );
}

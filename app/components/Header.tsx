"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
//import AuthButtonsServer from "./AuthButtonsServer";
import HeaderMenuClient from "./HeaderMenuClient";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                mobileMenuRef.current &&
                !mobileMenuRef.current.contains(e.target as Node)
            ) {
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

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
        const href = e.currentTarget.getAttribute("href");
        if (href?.startsWith("#")) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: "smooth" });
            }
            setMenuOpen(false);
        }
    };

    return (
        <header className={`header-section ${scrolled ? "scrolled" : ""}`}>
            <div className="header-container">
                <Link href="/" className="footer-logo-link">
                    <Image
                        src="/images/logo.png"
                        alt="Клинические рекомендации Минздрава — логотип"
                        width={101}
                        height={43}
                        loading="eager"
                    />
                </Link>

                <nav aria-label="Главное меню" className="navigation">
                    <ul className="main-menu">
                        <li>
                            <a href="#about" onClick={handleSmoothScroll}>
                                О проекте
                            </a>
                        </li>
                        <li>
                            <a href="#pricing" onClick={handleSmoothScroll}>
                                Тарифы
                            </a>
                        </li>
                        <li>
                            <a href="#video" onClick={handleSmoothScroll}>
                                Видео-инструкция
                            </a>
                        </li>
                        <li>
                            <a href="#contact" onClick={handleSmoothScroll}>
                                Контакты
                            </a>
                        </li>
                    </ul>
                </nav>

                <div className="header-buttons">

                    <Link href="/login" className="btn btn-demo">
                        Демо
                    </Link>
                </div>

                <HeaderMenuClient />
                {/* Мобильный бургер */}
                {/*<div className="mobile-nav">*/}
                {/*    <button*/}
                {/*        className={`burger-btn ${menuOpen ? "active" : ""}`}*/}
                {/*        aria-label="Открыть меню"*/}
                {/*        onClick={() => setMenuOpen(!menuOpen)}*/}
                {/*    >*/}
                {/*        <span className="burger-line"></span>*/}
                {/*        <span className="burger-line"></span>*/}
                {/*        <span className="burger-line"></span>*/}
                {/*    </button>*/}

                {/*    /!* Мобильное меню *!/*/}
                {/*    <div*/}
                {/*        ref={mobileMenuRef}*/}
                {/*        className={`mobile-menu ${menuOpen ? "active" : ""}`}*/}
                {/*    >*/}
                {/*        <nav aria-label="Мобильное меню">*/}
                {/*            <ul className="mobile-menu-list">*/}
                {/*                <li>*/}
                {/*                    <a href="#about" onClick={handleSmoothScroll}>*/}
                {/*                        О проекте*/}
                {/*                    </a>*/}
                {/*                </li>*/}
                {/*                <li>*/}
                {/*                    <a href="#pricing" onClick={handleSmoothScroll}>*/}
                {/*                        Тарифы*/}
                {/*                    </a>*/}
                {/*                </li>*/}
                {/*                <li>*/}
                {/*                    <a href="#video" onClick={handleSmoothScroll}>*/}
                {/*                        Видео-инструкция*/}
                {/*                    </a>*/}
                {/*                </li>*/}
                {/*                <li>*/}
                {/*                    <a href="#contact" onClick={handleSmoothScroll}>*/}
                {/*                        Контакты*/}
                {/*                    </a>*/}
                {/*                </li>*/}
                {/*            </ul>*/}
                {/*        </nav>*/}
                {/*        <div className="mobile-buttons">*/}
                {/*            <Link href="/login" className="btn btn-login btn-auth">*/}
                {/*                Войти*/}
                {/*            </Link>*/}
                {/*        </div>*/}
                {/*    </div>*/}
                {/*</div>*/}
            </div>

            {menuOpen && (
                <div className="overlay active" onClick={() => setMenuOpen(false)} />
            )}
        </header>
    );
}

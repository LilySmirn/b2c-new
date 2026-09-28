import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

import AuthButtonsServer from './components/AuthButtonsServer';
// import Header from "./components/Header";
import ConditionalHeader from './components/ConditionalHeader';
import ConditionalFooter from './components/ConditionalFooter';
import RouteBodyClass from './components/RouteBodyClass';
import UserBlockingGuard from './modules/userBlocking/components/UserBlockingGuard';
import landingLogo from '@/assets/images/landing/logo.svg';

export const metadata: Metadata = {
  title: "EasyMed",
  description: "EasyMed",
};

export default async function RootLayout({
   children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ru">
            <body>
                <UserBlockingGuard />
                <RouteBodyClass />
                 <ConditionalHeader>
                    <header id="header" className="header-section">
                    <div className="header-container">
                        <Link href="/" className="header-logo-link" aria-label="EasyMed — на главную">
                            <Image src={landingLogo}
                                   alt="EasyMed" width={90} height={58}
                                   priority />
                        </Link>
                        <nav aria-label="Главное меню" className="navigation">
                            <ul className="main-menu">
                                <li><Link href="/#capabilities">Возможности</Link></li>
                                <li><Link href="/#pricing">Тарифы</Link></li>
                                <li><Link href="/#reviews">Отзывы</Link></li>
                                <li><Link href="/#faq">FAQ</Link></li>
                            </ul>
                        </nav>
                        <div className="header-buttons">
                            <AuthButtonsServer variant="header" />
                            <button type="button" className="btn btn-logout-preview">Выйти</button>
                            <Link href="/mkb" className="btn btn-back-preview">←Назад</Link>
                        </div>
                        <div className="mobile-nav">
                            <button className="burger-btn" aria-label="Открыть меню">
                                <span className="burger-line"></span>
                                <span className="burger-line"></span>
                                <span className="burger-line"></span>
                            </button>

                            <div className="mobile-menu">
                                <nav aria-label="Мобильное меню">
                                    <ul className="mobile-menu-list">
                                        <li><Link href="/#capabilities">Возможности</Link></li>
                                        <li><Link href="/#pricing">Тарифы</Link></li>
                                        <li><Link href="/#video">Видео-инструкция</Link></li>
                                        <li><Link href="/#reviews">Отзывы</Link></li>
                                        <li><Link href="/#faq">FAQ</Link></li>
                                    </ul>
                                </nav>
                                <div className="mobile-buttons">
                                    <Link href="/login" className="btn btn-login btn-auth">Войти</Link>
                                </div>
                            </div>
                        </div>
                        <div className="overlay hidden"></div>
                    </div>
                </header>
                </ConditionalHeader>

                <main className="site-main">{children}</main>
                <ConditionalFooter>
                <footer id="footer" className="footer">
                    <div className="footer-container">
                        <section className="footer-contacts" id="contact" aria-labelledby="footer-contacts-heading">
                            <h2 id="footer-contacts-heading" className="visually-hidden">Контакты</h2>
                            <ul className="footer-contact-list">
                                <li><strong>Email: </strong><Link href="mailto:info@easymed.pro">info@easymed.pro</Link></li>
                            </ul>
                            <div className="footer-socials" aria-label="Мы в социальных сетях">
                                <a href="#" aria-label="Telegram">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 3.4 2.9 10.3c-1.2.5-1.2 1.1-.2 1.4l4.6 1.4 1.8 5.5c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.2-2.1 4.7 3.5c.9.5 1.5.3 1.7-.8l3-14.3c.3-1.4-.5-2-1.8-1.5ZM9 12.8l9-5.7c.4-.3.8-.1.5.2l-7.4 6.7-.3 3.4L9 12.8Z"/></svg>
                                </a>
                                <a href="#" aria-label="MAX">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.1l2.9 5 2.9-5H19v16h-4v-9.2l-3 5-3-5V20H5V4Z"/></svg>
                                </a>
                                <a href="#" aria-label="ВКонтакте">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 18.3C5.1 18.3.8 13.2.6 4.7h3.8c.1 6.2 2.9 8.9 5.1 9.5V4.7h3.6v5.4c2.2-.2 4.5-2.7 5.3-5.4H22c-.6 3.3-3.1 5.8-4.9 6.8 1.8.8 4.7 3 5.8 6.8h-4c-.9-2.6-3-4.6-5.8-4.9v4.9h-.5Z"/></svg>
                                </a>
                            </div>
                            <hr />
                        </section>

                        <section className="footer-legal" aria-labelledby="footer-legal-heading">
                            <h2 id="footer-legal-heading" className="visually-hidden">Правовая информация</h2>
                            <div className="legal-link">
                                <a href="/policy.pdf" target="_blank" rel="noopener noreferrer">
                                    Политика конфиденциальности
                                </a>
                                <a href="/agreement.pdf" target="_blank" rel="noopener noreferrer">
                                    Пользовательское соглашение
                                </a>
                            </div>
                            <div className="copyright">2026 easymed.pro</div>
                            <div className="inn">
                                ИП Васильцов Давыд Юрьевич  <br />
                                ОГРНИП 324784700301501  <br />
                                ИНН 781304344630
                            </div>
                        </section>
                    </div>
                </footer>
                </ConditionalFooter>
            </body>
        </html>
    );
}

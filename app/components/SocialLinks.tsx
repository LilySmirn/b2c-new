import Image from "next/image";
import maxLogo from "@/assets/images/landing/Max_logo.svg";

export default function SocialLinks({ className = "" }: { className?: string }) {
    return (
        <div className={`social-links ${className}`.trim()} aria-label="Мы в социальных сетях">
            <a href="https://t.me/easymedpro" aria-label="Telegram" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 3.4 2.9 10.3c-1.2.5-1.2 1.1-.2 1.4l4.6 1.4 1.8 5.5c.2.6.1.9.8.9.5 0 .8-.2 1-.4l2.2-2.1 4.7 3.5c.9.5 1.5.3 1.7-.8l3-14.3c.3-1.4-.5-2-1.8-1.5ZM9 12.8l9-5.7c.4-.3.8-.1.5.2l-7.4 6.7-.3 3.4L9 12.8Z" /></svg>
            </a>
            <a href="https://max.ru/channel_easymed" aria-label="MAX" target="_blank" rel="noopener noreferrer">
                <Image className="max-social-logo" src={maxLogo} alt="" />
            </a>
            <a href="https://vk.ru/easymedpro" aria-label="ВКонтакте" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.6 18.3C5.1 18.3.8 13.2.6 4.7h3.8c.1 6.2 2.9 8.9 5.1 9.5V4.7h3.6v5.4c2.2-.2 4.5-2.7 5.3-5.4H22c-.6 3.3-3.1 5.8-4.9 6.8 1.8.8 4.7 3 5.8 6.8h-4c-.9-2.6-3-4.6-5.8-4.9v4.9h-.5Z" /></svg>
            </a>
        </div>
    );
}
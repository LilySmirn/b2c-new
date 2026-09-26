"use client";

import { useEffect, useRef, useState } from "react";
import ErrorModal from "./ErrorModal";
import { safeTry } from "@/app/lib/safeTry";

type CorporateContactPopupProps = {
    onClose: () => void;
};

export default function CorporateContactPopup({ onClose }: CorporateContactPopupProps) {
    const [loading, setLoading] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({
        email: "",
        name: "",
        phone: "",
        crm: "",
    });
    const [showError, setShowError] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        document.body.classList.add("noscroll");

        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.classList.remove("noscroll");
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);

        await safeTry(
            async () => {
                const response = await fetch("/api/sendTelegram", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });

                if (!response.ok) throw new Error("Сервер вернул ошибку");

                const data = await response.json();
                setFormData({ email: "", name: "", phone: "", crm: "" });
                onClose();
                alert(data.message);
            },
            { setErrorMsg, setShowError },
        );

        setLoading(false);
    };

    return (
        <>
            <div className="popup-overlay">
                <div
                    className="call-popup"
                    ref={popupRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="corporate-contact-title"
                >
                    <div className="call-popup__text">
                        <span className="call-popup__eyebrow">Для медицинских организаций</span>
                        <h2 id="corporate-contact-title">Корпоративный доступ</h2>
                        <p>Расскажите немного о вашей клинике — мы свяжемся с вами и подберём подходящие условия.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="call-popup__form">
                        <div className="call-popup__fields">
                            <label>
                                <span>Рабочая почта</span>
                                <input type="email" name="email" placeholder="name@clinic.ru" autoComplete="email" value={formData.email} onChange={handleChange} required />
                            </label>
                            <label>
                                <span>Ваше имя</span>
                                <input type="text" name="name" placeholder="Как к вам обращаться" autoComplete="name" value={formData.name} onChange={handleChange} required />
                            </label>
                            <label>
                                <span>Телефон</span>
                                <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" autoComplete="tel" value={formData.phone} onChange={handleChange} required />
                            </label>
                            <label>
                                <span>Название клиники <small>необязательно</small></span>
                                <input type="text" name="crm" placeholder="Например, Медцентр" autoComplete="organization" value={formData.crm} onChange={handleChange} />
                            </label>
                        </div>

                        <div className="call-popup__btn">
                            <button type="submit" className="popup__btn" disabled={loading}>
                                {loading ? "Отправка..." : "Отправить"}
                            </button>
                        </div>
                        <p className="call-popup__notice">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</p>
                    </form>

                    <button type="button" className="call-popup__close" onClick={onClose} aria-label="Закрыть форму обратной связи">
                        <span aria-hidden="true" />
                    </button>
                </div>
            </div>

            {showError && (
                <ErrorModal
                    message={errorMsg}
                    onClose={() => setShowError(false)}
                    reportToTelegram={false}
                />
            )}
        </>
    );
}
"use client";
import { useState, useEffect, useRef } from "react";

export default function CorporateAccess() {
    const [popupOpen, setPopupOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        email: "",
        name: "",
        phone: "",
        crm: ""
    });

    useEffect(() => {
        if (popupOpen) {
            document.body.classList.add("noscroll");
        } else {
            document.body.classList.remove("noscroll");
        }
    }, [popupOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setPopupOpen(false);
            }
        }
        if (popupOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [popupOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/sendTelegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            alert(data.message);

            if (res.ok) {
                setFormData({ email: "", name: "", phone: "", crm: "" });
                setPopupOpen(false);
            }
        } catch {
            alert("Ошибка соединения. Проверьте интернет.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="corporate-access" className="corporate-access-section">
            <div className="corporate-access-container">
                <h2 className="title">
                    Нужен <span className="highlight">корпоративный</span> доступ?
                </h2>
                <p className="description">
                    Для клиник и медцентров действуют отдельные условия — <strong>напишите нам.</strong>
                </p>
                <button className="contact-button" onClick={() => setPopupOpen(true)}>
                    Оставить заявку
                </button>

                {popupOpen && (
                    <div className="popup-overlay">
                        <div className="call-popup" ref={popupRef}>
                            <div className="call-popup__text">
                                <h2>Корпоративный доступ</h2>
                                <p>Для клиник и медцентров действуют отдельные условия</p>
                            </div>

                            <form onSubmit={handleSubmit} className="call-popup__form">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Ваш email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Ваше имя"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="Введите номер телефона"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                                <input
                                    type="text"
                                    name="crm"
                                    placeholder="Название Вашей клиники"
                                    value={formData.crm}
                                    onChange={handleChange}
                                />

                                <div className="call-popup__btn">
                                    <button type="submit" className="popup__btn" disabled={loading}>
                                        {loading ? "Отправка..." : "Отправить"}
                                    </button>
                                </div>
                            </form>

                            <div className="call-popup__close" onClick={() => setPopupOpen(false)}>
                                <img src="/images/popup-exit.png" alt="close" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

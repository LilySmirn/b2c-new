"use client";

import { useState } from "react";
import CorporateContactPopup from "./CorporateContactPopup";

export default function CorporateAccess() {
    const [popupOpen, setPopupOpen] = useState(false);

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

                {popupOpen && <CorporateContactPopup onClose={() => setPopupOpen(false)} />}
            </div>
        </section>
    );
}

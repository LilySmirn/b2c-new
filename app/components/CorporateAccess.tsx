"use client";

import { useState } from "react";
import CorporateContactPopup from "./CorporateContactPopup";

export default function CorporateAccess() {
    const [popupOpen, setPopupOpen] = useState(false);

    return (
        <section id="corporate-access" className="corporate-access-section">
            <div className="corporate-access-container">
                <h2>Для клиник и медцентров действуют специальные условия</h2>
                <button className="contact-button" onClick={() => setPopupOpen(true)}>
                    Напишите нам
                </button>

                {popupOpen && <CorporateContactPopup onClose={() => setPopupOpen(false)} />}
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";
import TariffSuccessModal from "../TariffSuccessModal";

export default function ModalPreviewPage() {
    const [isOpen, setIsOpen] = useState(true);

    // фейковые данные для проверки
    const mockSubscription = {
        title: "Yjdsq",
        expiration_date: "2025-12-31",
    };

    return (
        <div>
            <h1 style={{ textAlign: "center", margin: "30px 0" }}>
                Preview: TariffSuccessModal
            </h1>

            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: "10px 20px",
                    background: "#0085FF",
                    color: "white",
                    borderRadius: "8px",
                    cursor: "pointer",
                    margin: "20px auto",
                    display: "block",
                }}
            >
                Открыть попап
            </button>

            {isOpen && (
                <TariffSuccessModal
                    subscription={mockSubscription}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}

"use client";

import { useId, useState } from "react";

export default function FaqItem({
                                    question,
                                    answer,
                                }: {
    question: string;
    answer: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const answerId = useId();

    return (
        <div className={`faq-item ${open ? "active" : ""}`}>
            <button
                className="faq-question"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-controls={answerId}
            >
                <span>{question}</span>
                <span className="faq-icon" aria-hidden="true" />
            </button>

            <div className="faq-answer" id={answerId}>
                {answer}
            </div>
        </div>
    );
}

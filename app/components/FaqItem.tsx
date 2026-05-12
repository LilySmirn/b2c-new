"use client";

import { useState } from "react";
import Image from "next/image";

export default function FaqItem({
                                    question,
                                    answer,
                                }: {
    question: string;
    answer: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className={`faq-item ${open ? "active" : ""}`}>
            <button
                className="faq-question"
                onClick={() => setOpen(!open)}
            >
                <span>{question}</span>
                <Image
                    src="/images/faq-icon.png"
                    alt="иконка"
                    className="faq-icon"
                    width={25}
                    height={10}
                />
            </button>

            <div className="faq-answer">
                {answer}
            </div>
        </div>
    );
}

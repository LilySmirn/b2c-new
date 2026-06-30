"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import chartIcon from "@/assets/images/action-panel-1.svg";
import copyIcon from "@/assets/images/action-panel-2.svg";
import documentIcon from "@/assets/images/action-panel-3.svg";
import styles from "./ActionPanel.module.css";

const actions = [
  {
    id: "chart",
    label: "Запись\nв карту",
    icon: chartIcon,
  },
  {
    id: "copy",
    label: "Скопировать\nвыбранное",
    icon: copyIcon,
  },
  {
    id: "doc",
    label: "Сформировать\nдокумент",
    icon: documentIcon,
  },
];

export default function ActionPanel() {
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

  useEffect(() => {
    if (!isIntegrationModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsIntegrationModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIntegrationModalOpen]);

  return (
    <>
      <div className={styles.panel}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.actionButton}
            onClick={action.id === "chart" ? () => setIsIntegrationModalOpen(true) : undefined}
          >
            <Image
              className={styles.icon}
              src={action.icon}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span className={styles.label}>
              {action.label.split("\n").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </button>
        ))}
      </div>

      {isIntegrationModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsIntegrationModalOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Информация об интеграции с МИС"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsIntegrationModalOpen(false)}
              aria-label="Закрыть окно интеграции с МИС"
            >
              ×
            </button>

            <p className={styles.modalText}>
              Хотите реализовать интеграцию
              <br />
              в ваш МИС?
              <br />
              Свяжитесь с нами
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButton}
                onClick={() => setIsIntegrationModalOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
"use client";

import styles from "./ActionPanel.module.css";

type MisIntegrationModalProps = {
  onClose: () => void;
  onContact: () => void;
  /** Компактная вёрстка поверх мини-корзинки. На странице корзины не передаётся. */
  compact?: boolean;
};

export default function MisIntegrationModal({
  onClose,
  onContact,
  compact = false,
}: MisIntegrationModalProps) {
  return (
    <div
      className={`${styles.modal}${compact ? " preparaty__mis-dialog" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Информация об интеграции с МИС"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Закрыть окно интеграции с МИС"
      >
        ×
      </button>

      <p className={styles.modalText}>
        Хотите реализовать интеграцию
        <br />
        в ваш МИС?
      </p>

      <div
        className={`${styles.modalActions}${compact ? " preparaty__mis-actions" : ""}`}
      >
        <button
          type="button"
          className={styles.modalButton}
          onClick={onContact}
        >
          Свяжитесь с нами
        </button>
      </div>
    </div>
  );
}

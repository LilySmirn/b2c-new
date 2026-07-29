import { ReactNode } from "react";
import styles from "./NewBookmarkPopup.module.css";

type PopupShellProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function PopupShell({ children, onClose }: PopupShellProps) {
  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bookmark-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Закрыть попап"
          onClick={onClose}
        >
          ×
        </button>
        <div className={styles.modalContent}>{children}</div>
      </section>
    </div>
  );
}
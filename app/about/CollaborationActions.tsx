"use client";

import { useState } from "react";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import styles from "./page.module.css";

export default function CollaborationActions() {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div className={styles.collaborationActions}>
        <button
          type="button"
          className={styles.collaborationPrimary}
          onClick={() => setPopupOpen(true)}
          aria-haspopup="dialog"
        >
          Обсудить интеграцию <span aria-hidden="true">→</span>
        </button>
        <button
          type="button"
          className={styles.collaborationSecondary}
          onClick={() => setPopupOpen(true)}
          aria-haspopup="dialog"
        >
          Написать нам
        </button>
      </div>

      {popupOpen ? (
        <CorporateContactPopup onClose={() => setPopupOpen(false)} />
      ) : null}
    </>
  );
}

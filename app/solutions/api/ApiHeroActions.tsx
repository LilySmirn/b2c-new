"use client";

import { useState } from "react";
import Image from "next/image";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import playIcon from "@/assets/images/api-page/main-icon-2.png";
import styles from "./page.module.css";

export default function ApiHeroActions() {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setPopupOpen(true)}
          aria-haspopup="dialog"
        >
          Обсудить интеграцию <span aria-hidden="true">→</span>
        </button>
        <button type="button" className={styles.secondaryButton} disabled>
          <Image src={playIcon} alt="" width={27} height={27} />
          Посмотреть возможности API
        </button>
      </div>

      {popupOpen ? (
        <CorporateContactPopup onClose={() => setPopupOpen(false)} />
      ) : null}
    </>
  );
}

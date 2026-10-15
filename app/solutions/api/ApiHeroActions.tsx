"use client";

import { useState } from "react";
import Image from "next/image";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import playIcon from "@/assets/images/api-page/main-icon-2.png";
import styles from "./page.module.css";

type ApiHeroActionsProps = {
  variant?: "hero" | "integration";
};

export default function ApiHeroActions({
  variant = "hero",
}: ApiHeroActionsProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  const integrationButton = (
    <button
      type="button"
      className={
        variant === "hero" ? styles.primaryButton : styles.modulesApiButton
      }
      onClick={() => setPopupOpen(true)}
      aria-haspopup="dialog"
    >
      Обсудить интеграцию <span aria-hidden="true">→</span>
    </button>
  );

  return (
    <>
      {variant === "hero" ? (
        <div className={styles.actions}>
          {integrationButton}
          <button type="button" className={styles.secondaryButton} disabled>
            <Image src={playIcon} alt="" width={27} height={27} />
            Посмотреть возможности API
          </button>
        </div>
      ) : (
        integrationButton
      )}

      {popupOpen ? (
        <CorporateContactPopup onClose={() => setPopupOpen(false)} />
      ) : null}
    </>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import integrationBg from "@/assets/images/about/integration-bg.png";
import sqnsLogo from "@/assets/images/about/sqns.png";
import otherMisIcon from "@/assets/images/about/other-mis-icon.png";
import yourMisIcon from "@/assets/images/about/your-mis-icon.png";
import styles from "./page.module.css";

export default function IntegrationsSection() {
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <section
      className={styles.integrations}
      aria-labelledby="integrations-title"
      id="integrations"
    >
      <div className={styles.integrationsInner}>
        <div className={styles.integrationsBanner}>
          <Image
            className={styles.integrationsBannerBg}
            src={integrationBg}
            alt=""
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            priority={false}
          />

          <div className={styles.integrationsContent}>
            <div className={styles.integrationsCopy}>
              <p className={styles.integrationsEyebrow}>Интеграции</p>
              <h2 className={styles.integrationsTitle} id="integrations-title">
                Мы уже интегрируемся
                <br />
                с медицинскими системами
              </h2>
            </div>

            <ul className={styles.integrationsList}>
              <li className={styles.integrationsPartner}>
                <Image
                  className={styles.integrationsSqns}
                  src={sqnsLogo}
                  alt="SQNS"
                  width={99}
                  height={33}
                />
                <span className={styles.integrationsMisLabel}>МИС</span>
              </li>

              <li className={styles.integrationsDivider} aria-hidden="true" />

              <li className={styles.integrationsPartner}>
                <span className={styles.integrationsSimed}>СиМед Клиника</span>
                <span className={styles.integrationsMisLabel}>МИС</span>
              </li>

              <li className={styles.integrationsDivider} aria-hidden="true" />

              <li className={styles.integrationsOther}>
                <span className={styles.integrationsIconPad} aria-hidden="true">
                  <Image
                    src={otherMisIcon}
                    alt=""
                    width={23}
                    height={18}
                  />
                </span>
                <div className={styles.integrationsOtherText}>
                  <span className={styles.integrationsOtherTitle}>Другие МИС</span>
                  <span className={styles.integrationsOtherDesc}>
                    Интеграция в разработке
                  </span>
                </div>
              </li>

              <li className={styles.integrationsDivider} aria-hidden="true" />

              <li className={styles.integrationsCardItem}>
                <button
                  type="button"
                  className={styles.integrationsCard}
                  onClick={() => setPopupOpen(true)}
                  aria-haspopup="dialog"
                >
                  <span className={styles.integrationsIconPad} aria-hidden="true">
                    <Image
                      src={yourMisIcon}
                      alt=""
                      width={21}
                      height={20}
                    />
                  </span>
                  <span className={styles.integrationsCardText}>
                    <span className={styles.integrationsCardTitle}>Ваша МИС</span>
                    <span className={styles.integrationsCardDesc}>
                      Обсудим сценарий интеграции EasyMed
                    </span>
                  </span>
                  <span className={styles.integrationsCardArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {popupOpen ? (
        <CorporateContactPopup onClose={() => setPopupOpen(false)} />
      ) : null}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";import Image from "next/image";
import styles from "./RecommendationCard.module.css";
import eagleIcon from "@/assets/images/eagle.png";

type RecommendationCardProps = {
  title: string;
  selected?: boolean;
  onSelect?: () => void;
  externalUrl: string;
  idLabel: string;
  idValue: string;
  statusLabel: string;
  statusValue: string;
  ageCategoryLabel: string;
  ageCategoryValue: string;
  publicationDateLabel: string;
  publicationDateValue: string;
  approvalYearLabel: string;
  approvalYearValue: string;
  classificationLabel: string;
  classificationValue: string;
  showBookmarkMenu?: boolean;
  onAddBookmark?: () => void;
};

export default function RecommendationCard({
  title,
  externalUrl,
  idLabel,
  idValue,
  statusLabel,
  statusValue,
  ageCategoryLabel,
  ageCategoryValue,
  publicationDateLabel,
  publicationDateValue,
  approvalYearLabel,
  approvalYearValue,
  classificationLabel,
  classificationValue,
  selected = false,
  onSelect,
  showBookmarkMenu = false,
  onAddBookmark,
}: RecommendationCardProps) {
  const [isBookmarkMenuOpen, setIsBookmarkMenuOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const cardClassName = selected ? `${styles.card} ${styles.selected}` : styles.card;

  useEffect(() => {
    if (!isBookmarkMenuOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (cardRef.current?.contains(event.target as Node)) return;

      setIsBookmarkMenuOpen(false);
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isBookmarkMenuOpen]);

  return (
    <article
      ref={cardRef}
      className={cardClassName}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-pressed={onSelect ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect || (event.key !== "Enter" && event.key !== " ")) return;

        event.preventDefault();
        onSelect();
      }}
    >
      <div className={`${styles.header} ${showBookmarkMenu ? styles.headerWithMenu : ""}`}>
        <h3 className={styles.title}>{title}</h3>
        <div className={showBookmarkMenu ? styles.headerActions : undefined}>
          <a
            className={styles.eagleLink}
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Открыть внешний ресурс"
            onClick={(event) => event.stopPropagation()}
          >
            <Image src={eagleIcon} alt="Орел" className={styles.eagleIcon} />
          </a>

          {showBookmarkMenu ? (
            <>
              <button
                type="button"
                className={styles.bookmarkMenuButton}
                aria-label="Открыть меню рекомендации"
                aria-haspopup="menu"
                aria-expanded={isBookmarkMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsBookmarkMenuOpen((isOpen) => !isOpen);
                }}
              >
                <span />
                <span />
                <span />
              </button>

              {isBookmarkMenuOpen ? (
                <div className={styles.bookmarkMenu} role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.bookmarkMenuItem}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsBookmarkMenuOpen(false);
                      onAddBookmark?.();
                    }}
                  >
                    Добавить закладку
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.infoPair}>
            <span className={styles.label}>{idLabel}</span>
            <span className={`${styles.value} ${styles.idValue}`}>{idValue}</span>
          </div>

          <div className={styles.infoPair}>
            <span className={styles.label}>{statusLabel}</span>
            <span className={styles.value}>{statusValue}</span>
          </div>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{ageCategoryLabel}</span>
          <span className={styles.value}>{ageCategoryValue}</span>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{publicationDateLabel}</span>
          <span className={styles.value}>{publicationDateValue}</span>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{approvalYearLabel}</span>
          <span className={styles.value}>{approvalYearValue}</span>
        </div>

        <div className={`${styles.infoPair} ${styles.classificationPair}`}>
          <span className={styles.label}>{classificationLabel}</span>
          <span className={styles.value}>{classificationValue}</span>
        </div>
      </div>
    </article>
  );
}
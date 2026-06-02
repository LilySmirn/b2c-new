"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.png";
import adultIcon from "@/assets/images/adult.png";
import NewBookmarkPopup from "./NewBookmarkPopup";
import styles from "./Bookmarks.module.css";

const savedBookmarks = [
  {
    id: "k26-duodenal-ulcer",
    code: "K26",
    title: "Язва двенадцатиперсной кишки",
    visitIcon: stethoscopeIcon,
    ageIcon: adultIcon,
  },
];

export default function Bookmarks() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const activeCardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openMenuId) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (activeCardRef.current?.contains(event.target as Node)) return;

      activeCardRef.current = null;
      setOpenMenuId(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [openMenuId]);

  return (
    <>
      <section className={styles.bookmarks} aria-label="Закладки нозологий">
        {savedBookmarks.map((bookmark) => {
          const isMenuOpen = openMenuId === bookmark.id;

          return (
            <article key={bookmark.id} className={styles.bookmarkCard}>
              <button
                type="button"
                className={styles.bookmarkButton}
                aria-label={`Открыть ${bookmark.title}`}
              >
                <span className={styles.codeCircle}>{bookmark.code}</span>
                <span className={styles.bookmarkTitle}>{bookmark.title}</span>
                <span className={styles.iconRow} aria-hidden="true">
                  <Image src={bookmark.visitIcon} alt="" className={styles.filterIcon} />
                  <Image src={bookmark.ageIcon} alt="" className={styles.filterIcon} />
                </span>
              </button>

              <button
                type="button"
                className={styles.menuButton}
                aria-label="Открыть меню закладки"
                aria-expanded={isMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();

                  if (isMenuOpen) {
                    activeCardRef.current = null;
                    setOpenMenuId(null);
                    return;
                  }

                  activeCardRef.current = event.currentTarget.closest("article");
                  setOpenMenuId(bookmark.id);
                }}
              >
                <span />
                <span />
                <span />
              </button>

              {isMenuOpen ? (
                <div className={styles.menu} role="menu">
                  <button type="button" role="menuitem" className={styles.menuItem}>
                    Удалить
                  </button>
                  <button type="button" role="menuitem" className={styles.menuItem}>
                    Изменить
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}

        <button
          type="button"
          className={`${styles.bookmarkCard} ${styles.addCard}`}
          aria-label="Добавить закладку"
          onClick={() => setIsAddModalOpen(true)}
        >
          <span className={styles.codeCircle} aria-hidden="true">
            +
          </span>
          <span className={styles.bookmarkTitle}>Добавить</span>
        </button>
      </section>

      <NewBookmarkPopup isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </>
  );
}
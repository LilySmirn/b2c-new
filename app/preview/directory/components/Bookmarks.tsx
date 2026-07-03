"use client";

import { useEffect, useRef, useState } from "react";
import Image, { StaticImageData } from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.svg";
import injectionIcon from "@/assets/images/Injection.svg";
import hospitalIcon from "@/assets/images/hospital.svg";
import NewBookmarkPopup from "./NewBookmarkPopup";
import styles from "./Bookmarks.module.css";

export type BookmarkItem = {
  id: string;
  code: string;
  title: string;
  visitType?: string;
  ageGroup?: string;
};

const BOOKMARKS_STORAGE_KEY = "directoryBookmarks";

export const initialBookmarks: BookmarkItem[] = [
  {
    id: "k26-duodenal-ulcer",
    code: "K26",
    title: "Язва двенадцатиперсной кишки",
    visitType: "primary",
    ageGroup: "adult",
  },
];

const visitIcons: Record<string, StaticImageData> = {
  primary: stethoscopeIcon,
  repeat: injectionIcon,
  inpatient: hospitalIcon,
};

const ageBadges: Record<string, string> = {
  adult: "18+",
  child: "0+",
};

type BookmarksProps = {
  items?: BookmarkItem[];
  onBookmarkSelect?: (bookmark: BookmarkItem) => void;
};

const readStoredBookmarks = () => {
  if (typeof window === "undefined") return initialBookmarks;

  const storedValue = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
  if (!storedValue) return initialBookmarks;

  try {
    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? (parsed as BookmarkItem[]) : initialBookmarks;
  } catch {
    return initialBookmarks;
  }
};

export default function Bookmarks({ items = initialBookmarks, onBookmarkSelect }: BookmarksProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(items);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const activeCardRef = useRef<HTMLElement | null>(null);
  const [hasLoadedStoredBookmarks, setHasLoadedStoredBookmarks] = useState(false);

  useEffect(() => {
    setBookmarks(readStoredBookmarks());
    setHasLoadedStoredBookmarks(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredBookmarks) return;

    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, hasLoadedStoredBookmarks]);

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
        {bookmarks.map((bookmark) => {
          const isMenuOpen = openMenuId === bookmark.id;

          const visitIcon = visitIcons[bookmark.visitType ?? "primary"] ?? stethoscopeIcon;
          const ageBadge = ageBadges[bookmark.ageGroup ?? "adult"] ?? ageBadges.adult;

          return (
            <article key={bookmark.id} className={styles.bookmarkCard}>
              <button
                type="button"
                className={styles.bookmarkButton}
                aria-label={`Открыть ${bookmark.title}`}
                onClick={() => onBookmarkSelect?.(bookmark)}
              >
                <span className={styles.codeCircle}>{bookmark.code}</span>
                <span className={styles.bookmarkTitle}>{bookmark.title}</span>
                <span className={styles.iconRow} aria-hidden="true">
                  <Image src={visitIcon} alt="" className={styles.filterIcon} />
                  <span className={styles.ageBadge}>{ageBadge}</span>
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
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => {
                      setBookmarks((currentBookmarks) =>
                        currentBookmarks.filter((item) => item.id !== bookmark.id),
                      );
                      setOpenMenuId(null);
                    }}
                  >
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

      <NewBookmarkPopup
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddBookmark={(bookmark) => {
          setBookmarks((currentBookmarks) => [...currentBookmarks, bookmark]);
        }}
      />
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import Image, { StaticImageData } from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.svg";
import injectionIcon from "@/assets/images/Injection.svg";
import hospitalIcon from "@/assets/images/hospital.svg";
import NewBookmarkPopup from "./NewBookmarkPopup";
import LoadingSpinner from "./LoadingSpinner";
import styles from "./Bookmarks.module.css";

export type BookmarkItem = {
  id: string;
  code: string;
  title: string;
  recommendationTitle?: string;
  visitType?: string;
  ageGroup?: string;
};

const BOOKMARKS_STORAGE_KEY = "directoryBookmarks";

export const initialBookmarks: BookmarkItem[] = [
  {
    id: "k26-duodenal-ulcer",
    code: "K26",
    title: "Язва двенадцатиперсной кишки",
    recommendationTitle: "Язва двенадцатиперстной кишки",
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
  onBookmarkSelect?: (bookmark: BookmarkItem) => void | Promise<void>;
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
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [loadingBookmarkId, setLoadingBookmarkId] = useState<string | null>(null);
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

  const handleBookmarkClick = async (bookmark: BookmarkItem) => {
    if (!onBookmarkSelect || loadingBookmarkId) return;

    setOpenMenuId(null);
    setLoadingBookmarkId(bookmark.id);

    try {
      await onBookmarkSelect(bookmark);
    } finally {
      setLoadingBookmarkId(null);
    }
  };

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
          const isLoading = loadingBookmarkId === bookmark.id;

          const visitIcon = visitIcons[bookmark.visitType ?? "primary"] ?? stethoscopeIcon;
          const ageBadge = ageBadges[bookmark.ageGroup ?? "adult"] ?? ageBadges.adult;

          return (
            <article key={bookmark.id} className={styles.bookmarkCard}>
              <button
                type="button"
                className={styles.bookmarkButton}
                aria-label={isLoading ? `Открываем ${bookmark.title}` : `Открыть ${bookmark.title}`}
                aria-busy={isLoading}
                disabled={Boolean(loadingBookmarkId)}
                onClick={() => handleBookmarkClick(bookmark)}
              >
                <span className={styles.codeCircle}>
                  {isLoading ? (
                    <LoadingSpinner className={styles.bookmarkLoader}>
                      <span className={styles.loaderText}>Загружаем корзину...</span>
                    </LoadingSpinner>
                  ) : (
                    bookmark.code
                  )}
                </span>
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
                disabled={Boolean(loadingBookmarkId)}
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
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => {
                      setEditingBookmark(bookmark);
                      setOpenMenuId(null);
                    }}
                  >
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
        isOpen={isAddModalOpen || Boolean(editingBookmark)}
        editingBookmark={editingBookmark}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBookmark(null);
        }}
        onAddBookmark={(bookmark) => {
          setBookmarks((currentBookmarks) => [...currentBookmarks, bookmark]);
        }}
        onUpdateBookmark={(updatedBookmark) => {
          setBookmarks((currentBookmarks) =>
            currentBookmarks.map((bookmark) =>
              bookmark.id === updatedBookmark.id ? updatedBookmark : bookmark,
            ),
          );
        }}
      />
    </>
  );
}
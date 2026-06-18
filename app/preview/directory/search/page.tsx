"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import MatchesList from "../components/MatchesList";
import Bookmarks, { initialBookmarks, type BookmarkItem } from "../components/Bookmarks";
import styles from "./search.module.css";
import Image from "next/image";
import DirectoryPageHeader from "../components/DirectoryPageHeader";
import logoBig from "@/assets/images/logo-big.svg";

type MkbSearchResult = {
  code: string;
  name: string;
};

const formatMkbResult = ({ code, name }: MkbSearchResult) => `${code}: ${name}`;

const visitOptions = [
  { id: "primary", label: "Первичный" },
  { id: "repeat", label: "Повторный" },
  { id: "inpatient", label: "Стационар" },
];

const ageOptions = [
  { id: "adult", label: "Взрослый" },
  { id: "child", label: "Ребёнок" },
];

export default function SearchPreviewPage() {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState("primary");
  const [ageGroup, setAgeGroup] = useState("adult");
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [bookmarks] = useState<BookmarkItem[]>(initialBookmarks);
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const search = query.trim();
  const matches = useMemo(() => apiMatches.map(formatMkbResult), [apiMatches]);

  useEffect(() => {
    if (search.length < 2) {
      setApiMatches([]);
      setIsSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/search?search=${encodeURIComponent(search)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Не удалось получить данные поиска");
        }

        const data = (await response.json()) as MkbSearchResult[];
        setApiMatches(data);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        setApiMatches([]);
        setSearchError("Не удалось загрузить подсказки. Попробуйте позже.");
      } finally {
        setIsSearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search]);

  useEffect(() => {
    if (!isMatchesOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchDropdownRef.current?.contains(event.target as Node)) {
        setIsMatchesOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMatchesOpen]);

  const handleMatchSelect = (item: string) => {
    setQuery(item);
    setIsMatchesOpen(false);
  };

  const matchesEmptyText = (() => {
    if (search.length < 2) return "Введите минимум 2 символа";
    if (isSearchLoading) return "Ищем в базе МКБ...";
    return "Ничего не найдено";
  })();

  return (
    <>
      <DirectoryPageHeader variant="search" />
      <main className={styles.wrapper}>
        <section className={styles.content}>
          <Image src={logoBig} alt="EasyMed" className={styles.logo} priority />

          <div
            className={styles.searchDropdown}
            ref={searchDropdownRef}
            data-open={isMatchesOpen}
          >
            <SearchBar
              value={query}
              onChange={setQuery}
              onFocus={() => setIsMatchesOpen(true)}
              variant="connected"
            />

            {isMatchesOpen && (
              <MatchesList
                items={matches}
                emptyText={matchesEmptyText}
                footerText={searchError}
                onItemSelect={handleMatchSelect}
              />
            )}
          </div>

          <Filters
            visitOptions={visitOptions}
            visitValue={visitType}
            onVisitChange={setVisitType}
            ageOptions={ageOptions}
            ageValue={ageGroup}
            onAgeChange={setAgeGroup}
          />

          <Bookmarks items={bookmarks} />
        </section>
      </main>
    </>
  );
}
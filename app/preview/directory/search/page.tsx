"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import MatchesList from "../components/MatchesList";
import RecommendationCard from "../components/RecommendationCard";
import SuggestedCodesList from "../components/SuggestedCodesList";
import Bookmarks, { initialBookmarks, type BookmarkItem } from "../components/Bookmarks";
import styles from "./search.module.css";
import Image from "next/image";
import DirectoryPageHeader from "../components/DirectoryPageHeader";
import logoBig from "@/assets/images/logo-big.svg";
import { testRecommendationTitle } from "../components/recommendationTestTitle";

const matches = [
  "K26: Язва двенадцатиперстной кишки",
  "K26.0: Язва двенадцатиперстной кишки",
  "P10: Язвенная болезнь",
  "K20: Эзофагит",
  "K21: Гастроэзофагеальный рефлюкс",
  "K21.0: Гастроэзофагеальный рефлюкс с эзофагитом",
];

const visitOptions = [
  { id: "primary", label: "Первичный" },
  { id: "repeat", label: "Повторный" },
  { id: "inpatient", label: "Стационар" },
];

const recommendationCardBaseData = {
  externalUrl: "https://cr.minzdrav.gov.ru/",
  idLabel: "ID:",
  idValue: "277_2",
  statusLabel: "Статус:",
  statusValue: "Действует",
  ageCategoryLabel: "Возрастная категория:",
  ageCategoryValue: "Взрослые",
  publicationDateLabel: "Дата размещения КР:",
  publicationDateValue: "13.01.2025",
  approvalYearLabel: "Год утверждения:",
  approvalYearValue: "2024",
  classificationLabel:
    "Кодирование по международной статистической классификации болезней и проблем, связанных со здоровьем:",
  classificationValue:
    "K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0",
};

const recommendationSourceTexts = [`K26: ${testRecommendationTitle}`, ...matches.slice(1, 4)];
const emptySearchSuggestions = matches.slice(0, 4);

const getRecommendationTitle = (text: string) => {
  const [, rawTitle] = text.split(":");
  return rawTitle?.trim() || text.trim();
};

const createBookmarkId = (code: string, title: string) =>
  `${code}-${title}`
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");

const ageOptions = [
  { id: "adult", label: "Взрослый" },
  { id: "child", label: "Ребёнок" },
];

export default function SearchPreviewPage() {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState("primary");
  const [ageGroup, setAgeGroup] = useState("adult");
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(initialBookmarks);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((item) => item.toLowerCase().includes(q));
  }, [query]);

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

  const searchedCode = query.trim() || "K26";

  const addRecommendationBookmark = (text: string) => {
    const code = "K26";
    const title = getRecommendationTitle(text);
    const id = createBookmarkId(code, title);

    setBookmarks((currentBookmarks) => {
      if (currentBookmarks.some((bookmark) => bookmark.id === id)) {
        return currentBookmarks;
      }

      return [...currentBookmarks, { id, code, title, visitType, ageGroup }];
    });
  };

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

          {isMatchesOpen && <MatchesList items={filtered} />}
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

        <section className={styles.recommendationsGrid}>
          {recommendationSourceTexts.map((text) => (
            <RecommendationCard
              key={text}
              {...recommendationCardBaseData}
              title={getRecommendationTitle(text)}
              showBookmarkMenu
              onAddBookmark={() => addRecommendationBookmark(text)}
            />
          ))}
        </section>

        <section className={styles.emptyStateSection}>
          <p className={styles.emptyStateText}>
            По выбранному МКБ <strong>{searchedCode}</strong> рекомендации не
            найдены.
            <br />
            Возможно, вам подойдут следующие коды:
          </p>

          <SuggestedCodesList items={emptySearchSuggestions} />
        </section>
      </section>
      </main>
    </>
  );
}
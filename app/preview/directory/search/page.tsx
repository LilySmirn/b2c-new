"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import MatchesList from "../components/MatchesList";
import Bookmarks from "../components/Bookmarks";
import styles from "./search.module.css";
import Image from "next/image";
import DirectoryPageHeader from "../components/DirectoryPageHeader";
import logoBig from "@/assets/images/logo-big.svg";
import RecommendationCard from "../components/RecommendationCard";
import SuggestedCodesList from "../components/SuggestedCodesList";

type MkbSearchResult = {
  code: string;
  name: string;
};

type AgeGroup = "adult" | "child";
type VisitType = "primary" | "repeat" | "inpatient";
type FilterAvailability = Record<AgeGroup, Record<VisitType, boolean>>;

type MkbRecommendationsResponse = {
  child: MkbSearchResult[];
  grownup: MkbSearchResult[];
};

type RecommendationStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  ageCategory: string;
};

type StandardsByFilters = Record<AgeGroup, Record<VisitType, RecommendationStandard[]>>;

type MkbDataResponse = {
  availability: FilterAvailability;
  recommendations: MkbRecommendationsResponse;
  standards: StandardsByFilters;
};

const formatMkbResult = ({ code, name }: MkbSearchResult) => `${code}: ${name}`;
const getCodeFromMatch = (item: string) => item.split(":")[0]?.trim() ?? item.trim();

const visitOptions = [
  { id: "primary", label: "Первичный" },
  { id: "repeat", label: "Повторный" },
  { id: "inpatient", label: "Стационар" },
];

const ageOptions = [
  { id: "adult", label: "Взрослый" },
  { id: "child", label: "Ребёнок" },
];

const hasDataForFilters = (
  availability: FilterAvailability,
  age: AgeGroup,
  visit: VisitType,
) => availability[age][visit];

const getRecommendationExternalUrl = (source: string, id: string) => {
  if (source.toLowerCase() === "minzdrav" && id !== "—") {
    return `https://cr.minzdrav.gov.ru/schema/${encodeURIComponent(id)}`;
  }

  return "https://cr.minzdrav.gov.ru/";
};

export default function SearchPreviewPage() {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("primary");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [filterAvailability, setFilterAvailability] = useState<FilterAvailability | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mkbData, setMkbData] = useState<MkbDataResponse | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const search = query.trim();
  const matches = useMemo(() => apiMatches.map(formatMkbResult), [apiMatches]);
  const normalizedSearchCode = useMemo(() => {
    const code = search.match(/^[A-ZА-Я]\d{2}(?:\.\d+)?/i)?.[0];

    return code ? code.toUpperCase() : null;
  }, [search]);

  const selectedCode = useMemo(() => {
    const exactMatch = apiMatches.find((item) => formatMkbResult(item) === query);
    if (exactMatch) return exactMatch.code;

    return normalizedSearchCode ? getCodeFromMatch(normalizedSearchCode) : null;
  }, [apiMatches, normalizedSearchCode, query]);
  
  useEffect(() => {
    if (search.length < 3) {
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
    if (!submittedCode) {
      setMkbData(null);
      setFilterAvailability(null);
      setCardsError(null);
      setIsCardsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadMkbData = async () => {
      setIsCardsLoading(true);
      setCardsError(null);

      try {
        const response = await fetch(`/api/mkb-data?code=${encodeURIComponent(submittedCode)}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Не удалось получить данные по коду МКБ");

        const data = (await response.json()) as MkbDataResponse;
        setMkbData(data);
        setFilterAvailability(data.availability);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMkbData(null);
        setFilterAvailability(null);
        setCardsError("Не удалось загрузить данные по коду МКБ. Попробуйте позже.");
      } finally {
        setIsCardsLoading(false);
      }
    };

    loadMkbData();

    return () => controller.abort();
  }, [submittedCode]);

  useEffect(() => {
    if (!filterAvailability || hasDataForFilters(filterAvailability, ageGroup, visitType)) return;

    const fallbackCandidates = [
      { age: ageGroup === "adult" ? "child" : "adult", visit: visitType },
      ...visitOptions.map((visitOption) => ({
        age: ageGroup,
        visit: visitOption.id as VisitType,
      })),
      ...(ageOptions as { id: AgeGroup; label: string }[]).flatMap((ageOption) =>
        (visitOptions as { id: VisitType; label: string }[]).map((visitOption) => ({
          age: ageOption.id,
          visit: visitOption.id,
        })),
      ),
    ] as { age: AgeGroup; visit: VisitType }[];

    const fallback = fallbackCandidates.find(({ age, visit }) =>
      hasDataForFilters(filterAvailability, age, visit),
    );

    if (fallback) {
      setAgeGroup(fallback.age);
      setVisitType(fallback.visit);
    }
  }, [ageGroup, filterAvailability, visitType]);

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

  const disabledVisitIds = useMemo(() => {
    if (!filterAvailability) return [];

    return visitOptions
      .filter((option) => !hasDataForFilters(filterAvailability, ageGroup, option.id as VisitType))
      .map((option) => option.id);
  }, [ageGroup, filterAvailability]);

  const disabledAgeIds = useMemo(() => {
    if (!filterAvailability) return [];

    return ageOptions
      .filter((option) => !hasDataForFilters(filterAvailability, option.id as AgeGroup, visitType))
      .map((option) => option.id);
  }, [filterAvailability, visitType]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSubmittedCode(null);
  };

  const submitSearch = (code = selectedCode) => {
    setIsMatchesOpen(false);

    if (!code) return;

    setSubmittedCode(code);
  };
  
  const handleMatchSelect = (item: string) => {
    setQuery(item);
    submitSearch(getCodeFromMatch(item));
  };

  const recommendationCards = useMemo(
    () => mkbData?.standards[ageGroup][visitType] ?? [],
    [ageGroup, mkbData, visitType],
  );
  const recommendedMatches = useMemo(
    () => (ageGroup === "child" ? mkbData?.recommendations.child : mkbData?.recommendations.grownup) ?? [],
    [ageGroup, mkbData],
  );

  const shouldShowRecommendations = Boolean(
    submittedCode && !isCardsLoading && !cardsError && recommendationCards.length === 0,
  );

  const matchesEmptyText = (() => {
    if (search.length < 3) return "Введите минимум 3 символа";
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
              onChange={handleQueryChange}
              onFocus={() => setIsMatchesOpen(true)}
              onSearch={() => submitSearch()}
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
            onVisitChange={(value) => setVisitType(value as VisitType)}
            ageOptions={ageOptions}
            ageValue={ageGroup}
            onAgeChange={(value) => setAgeGroup(value as AgeGroup)}
            disabledVisitIds={disabledVisitIds}
            disabledAgeIds={disabledAgeIds}
          />

          <Bookmarks />
      
            {submittedCode ? (
            <section className={styles.recommendationsSection} aria-label="Клинические рекомендации">
              {isCardsLoading ? (
                <p className={styles.recommendationsMessage}>Загружаем клинические рекомендации...</p>
              ) : cardsError ? (
                <p className={styles.recommendationsMessage}>{cardsError}</p>
              ) : recommendationCards.length > 0 ? (
                <div className={styles.recommendationsGrid}>
                  {recommendationCards.map((card) => (
                    <RecommendationCard
                      key={`${card.id}-${card.title}`}
                      title={card.title}
                      externalUrl={getRecommendationExternalUrl(card.source, card.id)}
                      standardId={card.id}
                      status={card.status}
                      ageCategory={card.ageCategory}
                      classification={card.mkbCodes.length > 0 ? card.mkbCodes.join(", ") : submittedCode}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {shouldShowRecommendations && submittedCode ? (
            <section className={styles.emptyStateSection} aria-label="Рекомендованные коды МКБ">
              <p className={styles.emptyStateText}>
                По выбранному МКБ <strong>{submittedCode}</strong> рекомендации не найдены.
                <br />
                Возможно, вам подойдут следующие коды:
              </p>
              <SuggestedCodesList
                items={
                  recommendedMatches.length > 0
                    ? recommendedMatches.map(formatMkbResult)
                    : ["Рекомендованные коды не найдены"]
                }
                onItemSelect={
                  recommendedMatches.length > 0
                    ? (item) => handleMatchSelect(item)
                    : undefined
                }
              />
            </section>
          ) : null}

        </section>
      </main>
    </>
  );
}
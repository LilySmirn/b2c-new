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

type FiltersResponse = {
  availability: FilterAvailability;
};

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

type StandardsResponse = {
  standards: RecommendationStandard[];
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
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [filterAvailability, setFilterAvailability] = useState<FilterAvailability | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recommendedMatches, setRecommendedMatches] = useState<MkbSearchResult[]>([]);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [recommendationCards, setRecommendationCards] = useState<RecommendationStandard[]>([]);
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
    const shouldLoadRecommendations =
      Boolean(normalizedSearchCode) && search.length >= 2 && !isSearchLoading && apiMatches.length === 0;

    if (!shouldLoadRecommendations || !normalizedSearchCode) {
      setRecommendedMatches([]);
      setRecommendationsError(null);
      return;
    }

    const controller = new AbortController();

    const loadRecommendations = async () => {
      try {
        const response = await fetch(
          `/api/mkb-recommendations?code=${encodeURIComponent(normalizedSearchCode)}`,
          { signal: controller.signal },
        );

        if (!response.ok) throw new Error("Не удалось получить рекомендации");

        const data = (await response.json()) as MkbRecommendationsResponse;
        setRecommendedMatches(ageGroup === "child" ? data.child : data.grownup);
        setRecommendationsError(null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setRecommendedMatches([]);
        setRecommendationsError("Не удалось загрузить рекомендованные коды. Попробуйте позже.");
      }
    };

    loadRecommendations();

    return () => controller.abort();
  }, [ageGroup, apiMatches.length, isSearchLoading, normalizedSearchCode, search.length]);

  useEffect(() => {
    if (!selectedCode) {
      setFilterAvailability(null);
      return;
    }

    const controller = new AbortController();

    const loadFilterAvailability = async () => {
      try {
        const response = await fetch(`/api/filters?code=${encodeURIComponent(selectedCode)}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Не удалось получить данные фильтров");

        const data = (await response.json()) as FiltersResponse;
        setFilterAvailability(data.availability);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setFilterAvailability(null);
      }
    };

    loadFilterAvailability();

    return () => controller.abort();
  }, [selectedCode]);

  useEffect(() => {
    if (!selectedCode) {
      setRecommendationCards([]);
      setCardsError(null);
      setIsCardsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadRecommendationCards = async () => {
      setIsCardsLoading(true);
      setCardsError(null);

      try {
        const params = new URLSearchParams({
          code: selectedCode,
          age: ageGroup,
          visit: visitType,
        });
        const response = await fetch(`/api/mkb-standards?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Не удалось получить карточки рекомендаций");

        const data = (await response.json()) as StandardsResponse;
        setRecommendationCards(data.standards);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setRecommendationCards([]);
        setCardsError("Не удалось загрузить клинические рекомендации. Попробуйте позже.");
      } finally {
        setIsCardsLoading(false);
      }
    };

    loadRecommendationCards();

    return () => controller.abort();
  }, [ageGroup, selectedCode, visitType]);

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

  const handleMatchSelect = (item: string) => {
    setQuery(item);
    setIsMatchesOpen(false);
  };

  const shouldShowRecommendations = Boolean(
    normalizedSearchCode && search.length >= 2 && !isSearchLoading && apiMatches.length === 0,
  );

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
            onVisitChange={(value) => setVisitType(value as VisitType)}
            ageOptions={ageOptions}
            ageValue={ageGroup}
            onAgeChange={(value) => setAgeGroup(value as AgeGroup)}
            disabledVisitIds={disabledVisitIds}
            disabledAgeIds={disabledAgeIds}
          />

          <Bookmarks />
      
            {selectedCode ? (
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
                      idLabel="ID:"
                      idValue={card.id}
                      statusLabel="Статус:"
                      statusValue={card.status}
                      ageCategoryLabel="Возрастная категория:"
                      ageCategoryValue={card.ageCategory}
                      publicationDateLabel="Дата размещения КР:"
                      publicationDateValue="—"
                      approvalYearLabel="Год утверждения:"
                      approvalYearValue="—"
                      classificationLabel="Кодирование по международной статистической классификации болезней и проблем, связанных со здоровьем:"
                      classificationValue={card.mkbCodes.length > 0 ? card.mkbCodes.join(", ") : selectedCode}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {shouldShowRecommendations && normalizedSearchCode ? (
            <section className={styles.emptyStateSection} aria-label="Рекомендованные коды МКБ">
              <p className={styles.emptyStateText}>
                По выбранному МКБ <strong>{normalizedSearchCode}</strong> рекомендации не найдены.
                <br />
                Возможно, вам подойдут следующие коды:
              </p>
              <SuggestedCodesList
                items={
                  recommendedMatches.length > 0
                    ? recommendedMatches.map(formatMkbResult)
                    : [recommendationsError ?? "Рекомендованные коды не найдены"]
                }
                onItemSelect={
                  recommendedMatches.length > 0
                    ? (item) => {
                        setQuery(item);
                        setIsMatchesOpen(true);
                      }
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
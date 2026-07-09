"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "../components/SearchBar";
import LoadingSpinner from "../components/LoadingSpinner";
import Filters from "../components/Filters";
import MatchesList from "../components/MatchesList";
import Bookmarks, { type BookmarkItem } from "../components/Bookmarks";
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

type ChecklistSection = {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle?: string;
  groupTitle: string;
  items: {
    id: string;
    checked: boolean;
    qualityControl: boolean;
    code: string;
    title: string;
    info: string;
    comment: string;
    infoComment?: string;
  }[];
};

type RecommendationStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  ageCategory: string;
  prescriptions: ChecklistSection[];
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

const getAvailableFilters = (
  availability: FilterAvailability,
  preferredAge: AgeGroup,
  preferredVisit: VisitType,
) => {
  if (hasDataForFilters(availability, preferredAge, preferredVisit)) {
    return { age: preferredAge, visit: preferredVisit };
  }

  const fallbackCandidates = [
    { age: preferredAge === "adult" ? "child" : "adult", visit: preferredVisit },
    ...visitOptions.map((visitOption) => ({
      age: preferredAge,
      visit: visitOption.id as VisitType,
    })),
    ...(ageOptions as { id: AgeGroup; label: string }[]).flatMap((ageOption) =>
      (visitOptions as { id: VisitType; label: string }[]).map((visitOption) => ({
        age: ageOption.id,
        visit: visitOption.id,
      })),
    ),
  ] as { age: AgeGroup; visit: VisitType }[];

  return fallbackCandidates.find(({ age, visit }) =>
    hasDataForFilters(availability, age, visit),
  );
};

const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";
const SEARCH_STATE_STORAGE_KEY = "directorySearchState";

type StoredSearchState = {
  query?: string;
  visitType?: VisitType;
  ageGroup?: AgeGroup;
  submittedCode?: string | null;
  submittedDiagnosisTitle?: string | null;
};

const getCartRecommendationKey = (
  diagnosisTitle: string | null | undefined,
  card: RecommendationStandard,
) =>
  [diagnosisTitle, card.id, card.title, card.mkbCodes.join(",")]
    .filter(Boolean)
    .join("|");

    const isVisitType = (value: unknown): value is VisitType =>
  typeof value === "string" && visitOptions.some((option) => option.id === value);

const isAgeGroup = (value: unknown): value is AgeGroup =>
  typeof value === "string" && ageOptions.some((option) => option.id === value);

const readStoredSearchState = (): StoredSearchState | null => {
  if (typeof window === "undefined") return null;

  const storedValue = window.sessionStorage.getItem(SEARCH_STATE_STORAGE_KEY);
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredSearchState)
      : null;
  } catch {
    return null;
  }
};

const writeStoredSearchState = (state: StoredSearchState) => {
  window.sessionStorage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(state));
};

const getRecommendationExternalUrl = (source: string, id: string) => {
  if (source.toLowerCase() === "minzdrav" && id !== "—") {
    return `https://cr.minzdrav.gov.ru/schema/${encodeURIComponent(id)}`;
  }

  return "https://cr.minzdrav.gov.ru/";
};

export default function SearchPreviewPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState<VisitType>("primary");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedDiagnosisTitle, setSubmittedDiagnosisTitle] = useState<string | null>(null);
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [filterAvailability, setFilterAvailability] = useState<FilterAvailability | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mkbData, setMkbData] = useState<MkbDataResponse | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const hasRestoredSearchStateRef = useRef(false);

  useEffect(() => {
    if (hasRestoredSearchStateRef.current) return;

    const storedSearchState = readStoredSearchState();

    if (!storedSearchState) {
      hasRestoredSearchStateRef.current = true;
      return;
    }

    if (typeof storedSearchState.query === "string") {
      setQuery(storedSearchState.query);
    }

    if (isVisitType(storedSearchState.visitType)) {
      setVisitType(storedSearchState.visitType);
    }

    if (isAgeGroup(storedSearchState.ageGroup)) {
      setAgeGroup(storedSearchState.ageGroup);
    }

    setSubmittedCode(storedSearchState.submittedCode ?? null);
    setSubmittedDiagnosisTitle(storedSearchState.submittedDiagnosisTitle ?? null);

    window.setTimeout(() => {
      hasRestoredSearchStateRef.current = true;
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasRestoredSearchStateRef.current) return;

    writeStoredSearchState({
      query,
      visitType,
      ageGroup,
      submittedCode,
      submittedDiagnosisTitle,
    });
  }, [ageGroup, query, submittedCode, submittedDiagnosisTitle, visitType]);

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

    const fallback = getAvailableFilters(filterAvailability, ageGroup, visitType);

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

  const getDiagnosisTitle = (code: string, sourceText = query) => {
    const formattedMatch = sourceText.trim();
    if (getCodeFromMatch(formattedMatch).toUpperCase() === code.toUpperCase() && formattedMatch.includes(":")) {
      return formattedMatch;
    }

    const apiMatch = apiMatches.find((item) => item.code.toUpperCase() === code.toUpperCase());

    return apiMatch ? formatMkbResult(apiMatch) : code;
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSubmittedCode(null);
    setSubmittedDiagnosisTitle(null);
  };

  const submitSearch = (code = selectedCode, diagnosisTitle?: string) => {
    setIsMatchesOpen(false);

    if (!code) return;

    setSubmittedCode(code);
    setSubmittedDiagnosisTitle(diagnosisTitle ?? getDiagnosisTitle(code));
  };

  const handleMatchSelect = (item: string) => {
    setQuery(item);
    submitSearch(getCodeFromMatch(item), item);
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

  const getBookmarkDiagnosisTitle = (bookmark: BookmarkItem) => {
    const bookmarkTitle = bookmark.title.trim();

    return getCodeFromMatch(bookmarkTitle).toUpperCase() === bookmark.code.toUpperCase() &&
      bookmarkTitle.includes(":")
      ? bookmarkTitle
      : `${bookmark.code}: ${bookmarkTitle}`;
  };

  const handleBookmarkSelect = async (bookmark: BookmarkItem) => {
    const bookmarkVisitType = isVisitType(bookmark.visitType) ? bookmark.visitType : visitType;
    const bookmarkAgeGroup = isAgeGroup(bookmark.ageGroup) ? bookmark.ageGroup : ageGroup;
    const diagnosisTitle = getBookmarkDiagnosisTitle(bookmark);

    try {
      const response = await fetch(`/api/mkb-data?code=${encodeURIComponent(bookmark.code)}`);

      if (!response.ok) throw new Error("Не удалось получить данные по коду МКБ");

      const data = (await response.json()) as MkbDataResponse;
      const availableFilters = getAvailableFilters(
        data.availability,
        bookmarkAgeGroup,
        bookmarkVisitType,
      );
      if (!availableFilters) {
        setCardsError("По выбранной закладке клинические рекомендации не найдены.");
        return;
      }

      const selectedCard = data.standards[availableFilters.age][availableFilters.visit][0];

      if (!selectedCard) {
        setCardsError("По выбранной закладке клинические рекомендации не найдены.");
        return;
      }

      const serializedCartRecommendation = JSON.stringify({
        diagnosisTitle,
        recommendationKey: getCartRecommendationKey(diagnosisTitle, selectedCard),
        recommendation: selectedCard,
      });

      window.sessionStorage.setItem(
        CART_RECOMMENDATION_STORAGE_KEY,
        serializedCartRecommendation,
      );
      window.localStorage.setItem(
        CART_RECOMMENDATION_STORAGE_KEY,
        serializedCartRecommendation,
      );
      router.push("/preview/directory/cart");
    } catch (error) {
      setCardsError("Не удалось открыть закладку. Попробуйте позже.");
    }
  };

  const handleCardSelect = (card: RecommendationStandard) => {
    const diagnosisTitle = submittedDiagnosisTitle ?? submittedCode ?? card.title;
    
    writeStoredSearchState({
      query,
      visitType,
      ageGroup,
      submittedCode,
      submittedDiagnosisTitle,
    });

    const serializedCartRecommendation = JSON.stringify({
      diagnosisTitle,
      recommendationKey: getCartRecommendationKey(diagnosisTitle, card),
      recommendation: card,
    });

    window.sessionStorage.setItem(
      CART_RECOMMENDATION_STORAGE_KEY,
      serializedCartRecommendation,
    );
    window.localStorage.setItem(
      CART_RECOMMENDATION_STORAGE_KEY,
      serializedCartRecommendation,
    );
    router.push("/preview/directory/cart");
  };

  const matchesEmptyText = (() => {
    if (search.length < 3) return "Введите минимум 3 символа";
    if (isSearchLoading) return <LoadingSpinner>Ищем в базе МКБ...</LoadingSpinner>;
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

          <Bookmarks onBookmarkSelect={handleBookmarkSelect} />

            {submittedCode ? (
            <section className={styles.recommendationsSection} aria-label="Клинические рекомендации">
              {isCardsLoading ? (
                <p className={styles.recommendationsMessage}>
                  <LoadingSpinner>Загружаем клинические рекомендации...</LoadingSpinner>
                </p>
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
                      onSelect={() => handleCardSelect(card)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {shouldShowRecommendations && submittedCode ? (
            <section className={styles.emptyStateSection} aria-label="Рекомендованные коды МКБ">
              {recommendedMatches.length > 0 ? (
                <>
                  <p className={styles.emptyStateText}>
                    По выбранному МКБ <strong>{submittedCode}</strong> рекомендации не найдены.
                    <br />
                    Возможно, вам подойдут следующие коды:
                  </p>
                  <SuggestedCodesList
                    items={recommendedMatches.map(formatMkbResult)}
                    onItemSelect={(item) => handleMatchSelect(item)}
                  />
                </>
              ) : (
                <p className={styles.emptyStateText}>
                  По выбранному МКБ <strong>{submittedCode}</strong> у Минздрава клинических
                  рекомендаций и стандартов не предусмотрено
                </p>
              )}
            </section>
          ) : null}

        </section>
      </main>
    </>
  );
}
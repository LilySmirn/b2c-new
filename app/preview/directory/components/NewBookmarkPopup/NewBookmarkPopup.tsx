"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SearchBar from "../SearchBar";
import Filters from "../Filters";
import MatchesList from "../MatchesList";
import NosologyNameField from "./NosologyNameField";
import PopupShell from "./PopupShell";
import RecommendationCard from "../RecommendationCard";
import LoadingSpinner from "../LoadingSpinner";
import { newBookmarkAgeOptions, newBookmarkVisitOptions } from "./data";
import styles from "./NewBookmarkPopup.module.css";
import type { BookmarkItem } from "../Bookmarks";

type MkbSearchResult = {
  code: string;
  name: string;
};

type AgeGroup = "adult" | "child";
type VisitType = "primary" | "repeat" | "inpatient";
type FilterAvailability = Record<AgeGroup, Record<VisitType, boolean>>;

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
  standards: StandardsByFilters;
};

type NewBookmarkPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddBookmark: (bookmark: BookmarkItem) => void;
  editingBookmark?: BookmarkItem | null;
  onUpdateBookmark?: (bookmark: BookmarkItem) => void;
};

const formatMkbResult = ({ code, name }: MkbSearchResult) => `${code}: ${name}`;
const getCodeFromMatch = (item: string) => item.split(":")[0]?.trim() ?? item.trim();
const isVisitType = (value: string): value is VisitType =>
  newBookmarkVisitOptions.some((option) => option.id === value);
const isAgeGroup = (value: string): value is AgeGroup =>
  newBookmarkAgeOptions.some((option) => option.id === value);

const hasDataForFilters = (
  availability: FilterAvailability,
  age: AgeGroup,
  visit: VisitType,
) => availability[age][visit];

const fullWidthGridItemStyle = { gridColumn: "1 / -1" };

const getRecommendationExternalUrl = (source: string, id: string) => {
  if (source.toLowerCase() === "minzdrav" && id !== "—") {
    return `https://cr.minzdrav.gov.ru/view-cr/${encodeURIComponent(id)}`;
  }

  return "https://cr.minzdrav.gov.ru/";
};

export default function NewBookmarkPopup({
  isOpen,
  onClose,
  onAddBookmark,
  editingBookmark = null,
  onUpdateBookmark,
}: NewBookmarkPopupProps) {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationStandard | null>(null);
  const [nosologyTitle, setNosologyTitle] = useState("");
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [filterAvailability, setFilterAvailability] = useState<FilterAvailability | null>(null);
  const [mkbData, setMkbData] = useState<MkbDataResponse | null>(null);
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const isEditMode = Boolean(editingBookmark);
  const canSubmitBookmark = Boolean((selectedRecommendation || isEditMode) && submittedCode && nosologyTitle.trim());

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
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setQuery(editingBookmark ? `${editingBookmark.code}: ${editingBookmark.title}` : "");
    setVisitType(editingBookmark?.visitType ?? "");
    setAgeGroup(editingBookmark?.ageGroup ?? "");
    setSelectedRecommendation(null);
    setNosologyTitle(editingBookmark?.title ?? "");
    setSubmittedCode(editingBookmark?.code ?? null);
    setApiMatches([]);
    setFilterAvailability(null);
    setMkbData(null);
    setIsMatchesOpen(false);
    setSearchError(null);
    setCardsError(null);
}, [editingBookmark, isOpen]);

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
        const response = await fetch(`/api/search?search=${encodeURIComponent(search)}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Не удалось получить данные поиска");

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
    if (!isMatchesOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!searchDropdownRef.current?.contains(event.target as Node)) {
        setIsMatchesOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMatchesOpen]);

  const hasAnyRecommendationCards = useMemo(() => {
    if (!mkbData) return false;

    return Object.values(mkbData.standards).some((standardsByVisit) =>
      Object.values(standardsByVisit).some((standards) => standards.length > 0),
    );
  }, [mkbData]);

  const hasNoRecommendationsForSubmittedCode = Boolean(
    submittedCode && mkbData && !isCardsLoading && !cardsError && !hasAnyRecommendationCards,
  );

  useEffect(() => {
    if (!hasNoRecommendationsForSubmittedCode) return;

    setVisitType("");
    setAgeGroup("");
    setSelectedRecommendation(null);
  }, [hasNoRecommendationsForSubmittedCode]);

  const disabledVisitIds = useMemo(() => {
    if (hasNoRecommendationsForSubmittedCode) {
      return newBookmarkVisitOptions.map((option) => option.id);
    }

    if (!filterAvailability || !ageGroup) return [];

    return newBookmarkVisitOptions
      .filter((option) => !hasDataForFilters(filterAvailability, ageGroup as AgeGroup, option.id as VisitType))
      .map((option) => option.id);
  }, [ageGroup, filterAvailability, hasNoRecommendationsForSubmittedCode]);

  const disabledAgeIds = useMemo(() => {
    if (hasNoRecommendationsForSubmittedCode) {
      return newBookmarkAgeOptions.map((option) => option.id);
    }

    if (!filterAvailability || !visitType) return [];

    return newBookmarkAgeOptions
      .filter((option) => !hasDataForFilters(filterAvailability, option.id as AgeGroup, visitType as VisitType))
      .map((option) => option.id);
  }, [filterAvailability, hasNoRecommendationsForSubmittedCode, visitType]);

  const recommendationCards = useMemo(() => {
    if (!mkbData || !isAgeGroup(ageGroup) || !isVisitType(visitType)) return [];

    return mkbData.standards[ageGroup][visitType] ?? [];
  }, [ageGroup, mkbData, visitType]);

  const submitSearch = (code = selectedCode, sourceText = query) => {
    setIsMatchesOpen(false);
    setSelectedRecommendation(null);

    if (!code) return;

    setSubmittedCode(code);
    setNosologyTitle(sourceText.includes(":") ? sourceText : code);
  };

  const handleMatchSelect = (item: string) => {
    setQuery(item);
    submitSearch(getCodeFromMatch(item), item);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSubmittedCode(null);
    setSelectedRecommendation(null);
    setNosologyTitle("");
  };

  const handleRecommendationSelect = (recommendation: RecommendationStandard) => {
    setSelectedRecommendation(recommendation);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  const handleSubmit = () => {
    if (!submittedCode || !nosologyTitle.trim()) return;

    const nextBookmark: BookmarkItem = {
      id: editingBookmark?.id ?? `${submittedCode}-${selectedRecommendation?.id ?? "custom"}-${Date.now()}`,
      code: submittedCode,
      title: nosologyTitle.trim() || selectedRecommendation?.title || submittedCode,
      visitType: isVisitType(visitType) ? visitType : undefined,
      ageGroup: isAgeGroup(ageGroup) ? ageGroup : undefined,
    };

    if (editingBookmark) {
      onUpdateBookmark?.(nextBookmark);
    } else if (selectedRecommendation) {
      onAddBookmark(nextBookmark);
    }

    onClose();
  };

  const matchesEmptyText = (() => {
    if (search.length < 3) return "Введите минимум 3 символа";
    if (isSearchLoading) return <LoadingSpinner>Ищем в базе МКБ...</LoadingSpinner>;
    return "Ничего не найдено";
  })();

  if (!isOpen) return null;

  return (
    <PopupShell onClose={onClose}>
      <h2 id="new-bookmark-title" className={styles.title}>
        {isEditMode ? "Изменить закладку" : "Новая закладка"}
      </h2>

      <div className={styles.searchBlock}>
        <div ref={searchDropdownRef}>
          <SearchBar
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setIsMatchesOpen(true)}
            onSearch={() => submitSearch()}
          />

          {isMatchesOpen ? (
            <MatchesList
              items={matches}
              emptyText={matchesEmptyText}
              footerText={searchError}
              onItemSelect={handleMatchSelect}
            />
          ) : null}
        </div>
      </div>

      <div className={styles.filtersArea}>
        <Filters
          visitOptions={newBookmarkVisitOptions}
          visitValue={visitType}
          onVisitChange={(value) => {
            setVisitType(value);
            setSelectedRecommendation(null);
          }}
          ageOptions={newBookmarkAgeOptions}
          ageValue={ageGroup}
          onAgeChange={(value) => {
            setAgeGroup(value);
            setSelectedRecommendation(null);
          }}
          disabledVisitIds={disabledVisitIds}
          disabledAgeIds={disabledAgeIds}
        />
      </div>

      <section className={styles.cardsGrid} aria-label="Рекомендации для закладки">
        {submittedCode ? (
          isCardsLoading ? (
            <p style={fullWidthGridItemStyle}>
              <LoadingSpinner>Загружаем клинические рекомендации...</LoadingSpinner>
            </p>
          ) : cardsError ? (
            <p style={fullWidthGridItemStyle}>{cardsError}</p>
          ) : hasNoRecommendationsForSubmittedCode ? (
            <p style={fullWidthGridItemStyle}>По выбранному МКБ {submittedCode} рекомендации не найдены.<br />Введите другой код в строку поиска</p>
          ) : !visitType || !ageGroup ? (
            <p style={fullWidthGridItemStyle}>Выберите фильтры, чтобы увидеть рекомендации.</p>
          ) : recommendationCards.length > 0 ? (
            recommendationCards.map((recommendation) => (
              <RecommendationCard
                key={`${recommendation.id}-${recommendation.title}`}
                title={recommendation.title}
                externalUrl={getRecommendationExternalUrl(recommendation.source, recommendation.id)}
                standardId={recommendation.id}
                status={recommendation.status}
                ageCategory={recommendation.ageCategory}
                classification={recommendation.mkbCodes.length > 0 ? recommendation.mkbCodes.join(", ") : submittedCode}
                selected={selectedRecommendation?.id === recommendation.id}
                onSelect={() => handleRecommendationSelect(recommendation)}
              />
            ))
          ) : (
            <p style={fullWidthGridItemStyle}>По выбранным фильтрам рекомендации не найдены.</p>
          )
        ) : null}
      </section>

      <NosologyNameField inputRef={titleInputRef} value={nosologyTitle} onChange={setNosologyTitle} />

      <button
        type="button"
        className={styles.submitButton}
        disabled={!canSubmitBookmark}
        onClick={handleSubmit}
      >
        {isEditMode ? "Сохранить изменения" : "Добавить закладку"}
      </button>
    </PopupShell>
  );
}
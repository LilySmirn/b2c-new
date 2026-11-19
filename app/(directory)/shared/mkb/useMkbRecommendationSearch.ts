"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchEncryptedJson } from "@/app/lib/encryptedPayload/client";
import { handleInvalidB2cSession } from "@/app/lib/handleInvalidB2cSession";
import { isMkbCodeAllowed, normalizeMkbCode } from "@/app/lib/mkbCodeAccess";
import { normalizeMkbSearchInput } from "@/app/lib/normalizeMkbSearchInput";
import { USER_BLOCKING_REFRESH_EVENT } from "@/app/modules/userBlocking";
import { DEMO_LIMIT_MESSAGE, isDemoLimitResponse } from "./demoAccess";
import {
  ageOptions,
  getAvailableFilters,
  hasDataForFilters,
  visitOptions,
} from "./filters";
import {
  formatMkbResult,
  getCodeFromMatch,
  getDiagnosisTitle,
  resolveSelectedCode,
} from "./searchHelpers";
import type {
  AgeGroup,
  FilterAvailability,
  MkbDataResponse,
  MkbSearchResult,
  RecommendationStandard,
  VisitType,
} from "./types";

type MkbAccessResponse = {
  allowedCodes: string[] | null;
};

export type UseMkbRecommendationSearchOptions = {
  initialVisit?: VisitType;
  initialAge?: AgeGroup;
  /** Debounce подсказок МКБ, мс. */
  suggestDebounceMs?: number;
};

/**
 * Поиск МКБ + загрузка карточек КР (как на `/mkb`).
 * Не открывает корзину и не пишет storage — только lookup.
 */
export function useMkbRecommendationSearch(
  options: UseMkbRecommendationSearchOptions = {},
) {
  const suggestDebounceMs = options.suggestDebounceMs ?? 300;

  const [query, setQueryState] = useState("");
  const [visitType, setVisitType] = useState<VisitType>(
    options.initialVisit ?? "primary",
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    options.initialAge ?? "adult",
  );
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [submittedDiagnosisTitle, setSubmittedDiagnosisTitle] = useState<
    string | null
  >(null);
  const [apiMatches, setApiMatches] = useState<MkbSearchResult[]>([]);
  const [filterAvailability, setFilterAvailability] =
    useState<FilterAvailability | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mkbData, setMkbData] = useState<MkbDataResponse | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [isCardsLoading, setIsCardsLoading] = useState(false);
  const [allowedMkbCodes, setAllowedMkbCodes] = useState<
    string[] | null | undefined
  >(undefined);
  const [isMkbAccessLoaded, setIsMkbAccessLoaded] = useState(false);
  const [mkbAccessError, setMkbAccessError] = useState<string | null>(null);
  const [demoRemaining, setDemoRemaining] = useState<number | null>(null);
  const demoResponseVersionRef = useRef(0);
  const cardsRequestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadMkbAccess = async () => {
      try {
        const response = await fetch("/api/mkb-access", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Не удалось проверить доступные коды МКБ");
        }

        const data = (await response.json()) as MkbAccessResponse;
        setAllowedMkbCodes(data.allowedCodes);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMkbAccessError(
          "Не удалось проверить доступные коды МКБ. Попробуйте позже.",
        );
      } finally {
        setIsMkbAccessLoaded(true);
      }
    };

    void loadMkbAccess();
    return () => controller.abort();
  }, []);

  const updateDemoRemainingFromResponse = useCallback((response: Response) => {
    const headerValue = response.headers.get("X-Demo-Remaining");
    if (headerValue === null) return;

    const remaining = Number(headerValue);
    if (Number.isInteger(remaining)) {
      demoResponseVersionRef.current += 1;
      setDemoRemaining(Math.max(0, remaining));
    }
  }, []);

  const search = query.trim();
  const matches = useMemo(
    () => apiMatches.map(formatMkbResult),
    [apiMatches],
  );
  const selectedCode = useMemo(
    () => resolveSelectedCode(query, apiMatches),
    [apiMatches, query],
  );

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
          { signal: controller.signal, cache: "no-store" },
        );

        if (await handleInvalidB2cSession(response)) return;

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
        if (!controller.signal.aborted) {
          setIsSearchLoading(false);
        }
      }
    }, suggestDebounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search, suggestDebounceMs]);

  useEffect(() => {
    if (!submittedCode) {
      setMkbData(null);
      setFilterAvailability(null);
      setCardsError(null);
      setIsCardsLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++cardsRequestIdRef.current;

    const loadMkbData = async () => {
      setIsCardsLoading(true);
      setCardsError(null);

      try {
        const { response, data } = await fetchEncryptedJson<MkbDataResponse>(
          `/api/mkb-data?code=${encodeURIComponent(submittedCode)}`,
          { signal: controller.signal, cache: "no-store" },
        );

        if (requestId !== cardsRequestIdRef.current) return;
        if (await handleInvalidB2cSession(response)) return;

        updateDemoRemainingFromResponse(response);

        if (response.headers.get("X-User-Blocked") === "true") {
          window.dispatchEvent(new Event(USER_BLOCKING_REFRESH_EVENT));
        }
        if (await isDemoLimitResponse(response)) {
          if (requestId !== cardsRequestIdRef.current) return;
          setMkbData(null);
          setFilterAvailability(null);
          setCardsError(DEMO_LIMIT_MESSAGE);
          return;
        }
        if (!response.ok || !data) {
          throw new Error("Не удалось получить данные по коду МКБ");
        }

        if (requestId !== cardsRequestIdRef.current) return;
        setMkbData(data);
        setFilterAvailability(data.availability);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (requestId !== cardsRequestIdRef.current) return;
        setMkbData(null);
        setFilterAvailability(null);
        setCardsError(
          "Не удалось загрузить данные по коду МКБ. Попробуйте позже.",
        );
      } finally {
        if (requestId === cardsRequestIdRef.current) {
          setIsCardsLoading(false);
        }
      }
    };

    void loadMkbData();

    return () => {
      controller.abort();
    };
  }, [submittedCode, updateDemoRemainingFromResponse]);

  useEffect(() => {
    if (
      !filterAvailability ||
      hasDataForFilters(filterAvailability, ageGroup, visitType)
    ) {
      return;
    }

    const fallback = getAvailableFilters(
      filterAvailability,
      ageGroup,
      visitType,
    );

    if (fallback) {
      setAgeGroup(fallback.age);
      setVisitType(fallback.visit);
    }
  }, [ageGroup, filterAvailability, visitType]);

  const disabledVisitIds = useMemo(() => {
    if (!filterAvailability) return [] as string[];

    return visitOptions
      .filter(
        (option) =>
          !hasDataForFilters(
            filterAvailability,
            ageGroup,
            option.id as VisitType,
          ),
      )
      .map((option) => option.id);
  }, [ageGroup, filterAvailability]);

  const disabledAgeIds = useMemo(() => {
    if (!filterAvailability) return [] as string[];

    return ageOptions
      .filter(
        (option) =>
          !hasDataForFilters(
            filterAvailability,
            option.id as AgeGroup,
            visitType,
          ),
      )
      .map((option) => option.id);
  }, [filterAvailability, visitType]);

  const setQuery = useCallback((value: string) => {
    setQueryState(normalizeMkbSearchInput(value));
    setMkbAccessError(null);
    setSubmittedCode(null);
    setSubmittedDiagnosisTitle(null);
  }, []);

  const submitSearch = useCallback(
    (code = selectedCode, diagnosisTitle?: string) => {
      setIsMatchesOpen(false);

      if (!code) return false;

      const normalizedCode = normalizeMkbCode(code);
      if (!isMkbAccessLoaded) {
        setMkbAccessError(
          "Проверяем доступные для аккаунта коды. Повторите поиск.",
        );
        return false;
      }

      if (allowedMkbCodes === undefined) {
        setMkbAccessError(
          "Не удалось проверить доступные коды МКБ. Попробуйте позже.",
        );
        return false;
      }

      if (
        allowedMkbCodes !== null &&
        !isMkbCodeAllowed(normalizedCode, allowedMkbCodes)
      ) {
        setMkbAccessError(
          `Для этого аккаунта доступны следующие коды: ${allowedMkbCodes.join(", ")}`,
        );
        return false;
      }

      setMkbAccessError(null);
      setSubmittedCode(normalizedCode);
      setSubmittedDiagnosisTitle(
        diagnosisTitle ??
          getDiagnosisTitle(normalizedCode, query, apiMatches),
      );
      return true;
    },
    [
      allowedMkbCodes,
      apiMatches,
      isMkbAccessLoaded,
      query,
      selectedCode,
    ],
  );

  const handleMatchSelect = useCallback(
    (item: string) => {
      setQueryState(item);
      submitSearch(getCodeFromMatch(item), item);
    },
    [submitSearch],
  );

  const cancelSearch = useCallback(() => {
    cardsRequestIdRef.current += 1;
    setSubmittedCode(null);
    setSubmittedDiagnosisTitle(null);
    setMkbData(null);
    setFilterAvailability(null);
    setCardsError(null);
    setIsCardsLoading(false);
    setMkbAccessError(null);
    setIsMatchesOpen(false);
  }, []);

  const resetAll = useCallback(() => {
    cancelSearch();
    setQueryState("");
    setApiMatches([]);
    setSearchError(null);
    setIsSearchLoading(false);
  }, [cancelSearch]);

  const recommendationCards = useMemo(
    () => mkbData?.standards[ageGroup][visitType] ?? [],
    [ageGroup, mkbData, visitType],
  );

  const recommendedMatches = useMemo(
    () =>
      (ageGroup === "child"
        ? mkbData?.recommendations.child
        : mkbData?.recommendations.grownup) ?? [],
    [ageGroup, mkbData],
  );

  const isResultsMode = Boolean(submittedCode);
  const cardDiagnosisTitle = submittedDiagnosisTitle ?? submittedCode;
  const shouldShowSuggestedCodes = Boolean(
    submittedCode &&
      !isCardsLoading &&
      !cardsError &&
      recommendationCards.length === 0,
  );

  return {
    query,
    setQuery,
    visitType,
    setVisitType,
    ageGroup,
    setAgeGroup,
    isMatchesOpen,
    setIsMatchesOpen,
    matches,
    isSearchLoading,
    searchError,
    selectedCode,
    submitSearch,
    handleMatchSelect,
    cancelSearch,
    resetAll,
    submittedCode,
    submittedDiagnosisTitle,
    cardDiagnosisTitle,
    isResultsMode,
    recommendationCards,
    recommendedMatches,
    shouldShowSuggestedCodes,
    isCardsLoading,
    cardsError,
    mkbAccessError,
    disabledVisitIds,
    disabledAgeIds,
    demoRemaining,
    formatMkbResult,
    visitOptions,
    ageOptions,
  };
}

export type MkbRecommendationSearchApi = ReturnType<
  typeof useMkbRecommendationSearch
>;

export type { RecommendationStandard };

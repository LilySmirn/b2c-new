"use client";

import LoadingSpinner from "@/app/(directory)/components/LoadingSpinner";
import MatchesList from "@/app/(directory)/components/MatchesList";
import RecommendationCard from "@/app/(directory)/components/RecommendationCard";
import SuggestedCodesList from "@/app/(directory)/components/SuggestedCodesList";
import NoTranslate from "@/app/components/NoTranslate";
import {
  DEMO_LIMIT_MESSAGE,
  getCartRecommendationKey,
  getRecommendationExternalUrl,
  type RecommendationStandard,
} from "@/app/(directory)/shared/mkb";
import type { MkbRecommendationSearchApi } from "@/app/(directory)/shared/mkb";

type MiniCartMkbSearchResultsProps = {
  search: MkbRecommendationSearchApi;
  showSuggestions: boolean;
  /** Показывать кнопку возврата к назначениям (режим карточек после submit). */
  showCancel?: boolean;
  loadingKey: string | null;
  selectError: string | null;
  onSelectCard: (card: RecommendationStandard) => void;
  onCancel: () => void;
};

export default function MiniCartMkbSearchResults({
  search,
  showSuggestions,
  showCancel = true,
  loadingKey,
  selectError,
  onSelectCard,
  onCancel,
}: MiniCartMkbSearchResultsProps) {
  const {
    matches,
    isSearchLoading,
    searchError,
    handleMatchSelect,
    isCardsLoading,
    cardsError,
    recommendationCards,
    recommendedMatches,
    shouldShowSuggestedCodes,
    submittedCode,
    cardDiagnosisTitle,
    mkbAccessError,
    formatMkbResult,
  } = search;

  const matchesEmptyText = (() => {
    if (search.query.trim().length < 3) return "Введите минимум 3 символа";
    if (isSearchLoading) {
      return <LoadingSpinner>Ищем в базе МКБ...</LoadingSpinner>;
    }
    return "Ничего не найдено";
  })();

  return (
    <div className="preparaty__mini-mkb-results">
      {showCancel ? (
        <div className="preparaty__mini-mkb-results-toolbar">
          <button
            type="button"
            className="preparaty__mini-mkb-results-cancel"
            onClick={onCancel}
          >
            Вернуться к назначениям
          </button>
        </div>
      ) : null}

      {mkbAccessError ? (
        <p className="preparaty__mini-mkb-status is-error" role="alert">
          {mkbAccessError}
        </p>
      ) : null}

      {selectError ? (
        <p className="preparaty__mini-mkb-status is-error" role="alert">
          {selectError}
        </p>
      ) : null}

      {showSuggestions ? (
        <div className="preparaty__mini-mkb-suggestions">
          <MatchesList
            items={matches}
            emptyText={matchesEmptyText}
            footerText={searchError}
            onItemSelect={handleMatchSelect}
            listClassName="preparaty__mini-mkb-matches"
            itemClassName="preparaty__mini-mkb-match"
          />
        </div>
      ) : null}

      {isCardsLoading ? (
        <p className="preparaty__mini-mkb-status">
          <LoadingSpinner>Загружаем клинические рекомендации...</LoadingSpinner>
        </p>
      ) : null}

      {!isCardsLoading && cardsError ? (
        cardsError === DEMO_LIMIT_MESSAGE ? (
          <p className="preparaty__mini-mkb-status is-error" role="alert">
            {cardsError}
          </p>
        ) : (
          <p className="preparaty__mini-mkb-status is-error" role="alert">
            {cardsError}
          </p>
        )
      ) : null}

      {!isCardsLoading && !cardsError && recommendationCards.length > 0 ? (
        <div
          className="preparaty__mini-mkb-cards"
          aria-label="Клинические рекомендации"
        >
          {recommendationCards.map((card) => {
            const cardKey = getCartRecommendationKey(
              cardDiagnosisTitle ?? card.title,
              card,
            );

            return (
              <RecommendationCard
                key={`${card.id}-${card.title}`}
                compact
                title={card.title}
                externalUrl={getRecommendationExternalUrl(
                  card.source,
                  card.id,
                )}
                standardId={card.id}
                status={card.status}
                ageCategory={card.ageCategory}
                dateApprovement={card.dateApprovement}
                dateReview={card.dateReview}
                classification={
                  card.mkbCodes.length > 0
                    ? card.mkbCodes.join(", ")
                    : (submittedCode ?? "")
                }
                busy={loadingKey === cardKey}
                onSelect={() => onSelectCard(card)}
              />
            );
          })}
        </div>
      ) : null}

      {shouldShowSuggestedCodes && submittedCode ? (
        <div className="preparaty__mini-mkb-empty">
          {recommendedMatches.length > 0 ? (
            <>
              <p className="preparaty__mini-mkb-status">
                По выбранному МКБ{" "}
                <strong>
                  <NoTranslate>{submittedCode}</NoTranslate>
                </strong>{" "}
                рекомендации не найдены. Возможно, вам подойдут следующие коды:
              </p>
              <SuggestedCodesList
                items={recommendedMatches.map(formatMkbResult)}
                onItemSelect={handleMatchSelect}
              />
            </>
          ) : (
            <p className="preparaty__mini-mkb-status">
              По выбранному МКБ{" "}
              <strong>
                <NoTranslate>{submittedCode}</NoTranslate>
              </strong>{" "}
              у Минздрава клинических рекомендаций и стандартов не предусмотрено
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

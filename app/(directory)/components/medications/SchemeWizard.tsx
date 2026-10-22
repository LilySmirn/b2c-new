"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  canAdvanceCombination,
  canCommitCombination,
  canGoBackCombination,
  catalogItemCard,
  chooseCombinationInn,
  chooseCombinationTrade,
  combinationProgressLabel,
  combinationPrompt,
  combinationReviewCard,
  combinationSlotText,
  commitCombinationDraft,
  confirmCombinationOther,
  createCombinationWizard,
  goBackCombination,
  goNextCombination,
  goToCombinationStep,
  innsOf,
  isComponentChosen,
  restartCombinationWizard,
  sameCatalogItem,
  showCombinationInnList,
  sortedTradeChoices,
  tradeItemsOf,
  type CombinationDraft,
  type CombinationWizardState,
} from "./combinationSelection";
import type { MedsCatalogComponent } from "./medsCatalogTypes";
import { sortedRuLabels } from "./ruSort";
import styles from "./SchemeWizard.module.css";

type SchemeWizardProps = {
  title: string;
  components: readonly MedsCatalogComponent[];
  confirmed: CombinationDraft | null;
  onClose: () => void;
  onConfirm: (draft: CombinationDraft) => void;
};

export default function SchemeWizard({
  title,
  components,
  confirmed,
  onClose,
  onConfirm,
}: SchemeWizardProps) {
  const titleId = useId();
  const [state, setState] = useState<CombinationWizardState>(() =>
    createCombinationWizard(components, confirmed),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const progress = combinationProgressLabel(state, components);
  const isReview = state.cursor.view === "review";
  const step = state.cursor.view === "step" ? state.cursor.step : -1;
  const stage = state.cursor.view === "step" ? state.cursor.stage : null;
  const component = step >= 0 ? components[step] : null;
  const pick = step >= 0 ? state.draft.picks[step] : null;
  const canBack = canGoBackCombination(state, components);
  const canAdvance = canAdvanceCombination(state, components);
  const canCommit = canCommitCombination(state, components);

  const finish = () => {
    const draft = commitCombinationDraft(state, components);
    if (!draft) return;
    onConfirm(draft);
  };

  const workTitle = () => {
    if (!component || step < 0) return "";

    const position = `Компонент ${step + 1}: ${component.name}`;
    if (component.type === "group" && stage === "inn") {
      return `${position} · выберите действующее вещество (МНН)`;
    }
    if (component.type === "group" && stage === "items") {
      return `${position}${pick?.inn ? ` · ${pick.inn}` : ""} · выберите торговое наименование`;
    }
    if (component.type === "drug") {
      return `${position} · выберите торговое наименование`;
    }

    return position;
  };

  const tradeCards = () => {
    if (!component || component.type === "other") return [];

    return tradeItemsOf(component, component.type === "group" ? pick?.inn ?? "" : "");
  };

  return createPortal(
    <div className={styles.layer}>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.head}>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p>{combinationPrompt(components.length)}</p>
            <div className={styles.progress}>{progress}</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className={styles.slots}>
          {components.map((entry, index) => {
            const chosen = isComponentChosen(entry, state.draft.picks[index]);
            const active = !isReview && step === index;

            return (
              <button
                key={`${entry.name}-${index}`}
                type="button"
                className={`${styles.slot} ${active ? styles.slotActive : ""} ${
                  chosen ? styles.slotDone : ""
                }`}
                onClick={() => setState((current) => goToCombinationStep(current, components, index))}
              >
                <span className={styles.slotNum}>{index + 1}</span>
                <span className={styles.slotBody}>
                  <strong>{entry.name}</strong>
                  <small>{combinationSlotText(entry, state.draft.picks[index])}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.work}>
          {isReview ? (
            <>
              <p className={styles.workTitle}>Проверьте выбранные препараты</p>
              <div className={styles.review}>
                {components.map((entry, index) => {
                  const card = combinationReviewCard(entry, state.draft.picks[index]);

                  return (
                    <div key={`${entry.name}-${index}`} className={styles.reviewRow}>
                      <span className={styles.slotNum}>{index + 1}</span>
                      <div>
                        <strong>{card.title}</strong>
                        {card.details.length > 0 ? <small>{card.details.join(" · ")}</small> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : component ? (
            <>
              <p className={styles.workTitle}>{workTitle()}</p>
              {component.type === "group" && stage === "items" ? (
                <button
                  type="button"
                  className={styles.backLink}
                  onClick={() =>
                    setState((current) => showCombinationInnList(current, components))
                  }
                >
                  ← Действующее вещество
                </button>
              ) : null}
              {component.type === "group" && stage === "inn" ? (
                <div className={styles.list}>
                  {sortedRuLabels(innsOf(component)).map((inn) => (
                    <button
                      key={inn}
                      type="button"
                      className={`${styles.card} ${
                        pick?.inn === inn ? styles.cardSelected : ""
                      }`}
                      onClick={() =>
                        setState((current) => chooseCombinationInn(current, components, inn))
                      }
                    >
                      <strong>{inn}</strong>
                    </button>
                  ))}
                </div>
              ) : null}
              {component.type !== "other" && stage === "items" ? (
                tradeCards().length > 0 ? (
                  <div className={styles.list}>
                    {sortedTradeChoices(tradeCards()).map(({ item, sourceIndex }) => {
                      const card = catalogItemCard(item, component.name);
                      const selected = Boolean(pick?.item && sameCatalogItem(pick.item, item));

                      return (
                        <button
                          key={`${item.name_trade}-${item.standard_dose}-${item.standard_form}-${item.SMNN_code}-${sourceIndex}`}
                          type="button"
                          className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
                          aria-pressed={selected}
                          onClick={() =>
                            setState((current) =>
                              chooseCombinationTrade(current, components, sourceIndex),
                            )
                          }
                        >
                          <strong>{card.title}</strong>
                          {card.details.map((detail, detailIndex) => (
                            <span key={`${detail}-${detailIndex}`}>{detail}</span>
                          ))}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.empty}>
                    {component.type === "group"
                      ? "В текущей выборке нет торговых наименований для этого МНН."
                      : "В текущей выборке нет торговых наименований."}
                  </p>
                )
              ) : null}
              {component.type === "other" ? (
                <div className={styles.other}>
                  <p>{component.name}</p>
                  {component.data[0]?.name.trim() &&
                  component.data[0].name.trim() !== component.name.trim() ? (
                    <p>{component.data[0].name}</p>
                  ) : null}
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() =>
                      setState((current) => confirmCombinationOther(current, components))
                    }
                  >
                    Подтвердить
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.empty}>Компоненты схемы не заданы.</p>
          )}
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.ghost} onClick={onClose}>
            Отмена
          </button>
          <div className={styles.footActions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={!canBack}
              onClick={() => setState((current) => goBackCombination(current, components))}
            >
              Назад
            </button>
            {isReview ? (
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setState(restartCombinationWizard(components))}
              >
                К началу
              </button>
            ) : null}
            {isReview ? (
              <button type="button" className={styles.primary} disabled={!canCommit} onClick={finish}>
                Готово
              </button>
            ) : (
              <button
                type="button"
                className={styles.primary}
                disabled={!canAdvance}
                onClick={() => setState((current) => goNextCombination(current, components))}
              >
                Далее
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

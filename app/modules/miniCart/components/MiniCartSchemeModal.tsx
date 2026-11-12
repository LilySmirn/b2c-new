"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "@/app/(directory)/components/medications/combinationSelection";
import type { MedsCatalogComponent } from "@/app/(directory)/components/medications/medsCatalogTypes";
import { sortedRuLabels } from "@/app/(directory)/components/medications/ruSort";
import type {
  MiniCartCatalogItem,
  MiniCartComponentPick,
  MiniCartTradesBook,
} from "../types";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartSchemeModalProps = {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  /** Production: компоненты каталога. Без них — demo-путь по trades book. */
  combinationComponents?: readonly MedsCatalogComponent[];
  confirmedDraft?: CombinationDraft | null;
  onClose: () => void;
  /** Demo: запись в локальный UI-state. */
  onDone: (picks: Record<string, MiniCartComponentPick>) => void;
  /** Directory: подтверждение через confirmCombination. */
  onConfirmCombination?: (draft: CombinationDraft) => void;
};

function DemoSchemeModal({
  item,
  trades,
  onClose,
  onDone,
}: {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  onClose: () => void;
  onDone: (picks: Record<string, MiniCartComponentPick>) => void;
}) {
  const components = item.components ?? [];
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState<"pick" | "trades" | "review">("pick");
  const [picks, setPicks] = useState<Record<string, MiniCartComponentPick>>(
    () => ({ ...(item.componentPicks ?? {}) }),
  );
  const [draftInn, setDraftInn] = useState("");

  const current = components[step];
  const ready = components.filter((component) => picks[component.id]).length;
  const isReview = stage === "review";

  const inns = useMemo(() => {
    if (!current) return [];
    if (current.kind === "alternatives") {
      return current.alternatives ?? [];
    }
    if (current.inn) {
      return [{ inn: current.inn, label: current.label }];
    }
    return [];
  }, [current]);

  const tradeRows = useMemo(() => {
    const inn = draftInn || picks[current?.id ?? ""]?.inn || "";
    return trades[inn]?.trades ?? [];
  }, [current, draftInn, picks, trades]);

  const pickInn = (inn: string) => {
    if (!current) return;
    setDraftInn(inn);
    setStage("trades");
  };

  const pickTrade = (trade: string, dose?: string, form?: string) => {
    if (!current) return;
    const inn = draftInn || current.inn || "";
    const next = {
      ...picks,
      [current.id]: { inn, trade, dose, form },
    };
    setPicks(next);
    setDraftInn("");
    if (step >= components.length - 1) {
      setStage("review");
      return;
    }
    setStep((value) => value + 1);
    setStage("pick");
  };

  return (
    <MiniCartPortal>
      <div className="preparaty__scheme-layer" role="presentation">
        <div
          className="preparaty__scheme-backdrop"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          className="preparaty__scheme-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Настройка схемы"
        >
          <div className="preparaty__scheme-head">
            <div>
              <h2>{item.name}</h2>
              <p>
                Выберите {components.length} отдельных препарата: сначала
                действующее вещество, затем торговое наименование.
              </p>
              <div className="preparaty__scheme-progress">
                {isReview
                  ? "Итог · все компоненты выбраны"
                  : `Шаг ${step + 1} из ${components.length}`}{" "}
                · выбрано {ready} из {components.length}
              </div>
            </div>
            <button
              type="button"
              className="preparaty__info-close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="preparaty__scheme-slots">
            {components.map((component, index) => {
              const pick = picks[component.id];
              return (
                <button
                  key={component.id}
                  type="button"
                  className={`preparaty__scheme-slot${
                    !isReview && step === index ? " is-active" : ""
                  }${pick ? " is-done" : ""}`}
                  onClick={() => {
                    setStep(index);
                    setStage(pick ? "review" : "pick");
                    setDraftInn(pick?.inn || "");
                  }}
                >
                  <span className="preparaty__scheme-slot-num">{index + 1}</span>
                  <span className="preparaty__scheme-slot-body">
                    <strong>{component.label}</strong>
                    {pick ? (
                      <span>
                        {pick.trade || pick.inn}
                        {pick.dose ? ` · ${pick.dose}` : ""}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="preparaty__scheme-work">
            {isReview ? (
              <>
                <p className="preparaty__scheme-work-title">
                  Проверьте выбранные компоненты
                </p>
                <div className="preparaty__scheme-review">
                  {components.map((component, index) => {
                    const pick = picks[component.id];
                    return (
                      <div
                        key={component.id}
                        className="preparaty__scheme-review-row"
                      >
                        <span className="preparaty__scheme-slot-num">
                          {index + 1}
                        </span>
                        <div>
                          <strong>{pick?.trade || pick?.inn || "—"}</strong>
                          <small>{component.label}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : stage === "trades" ? (
              <>
                <p className="preparaty__scheme-work-title">
                  Выберите торговое наименование
                </p>
                {tradeRows.length === 0 ? (
                  <p className="preparaty__scheme-empty">
                    В демо-данных нет торговых имён для этого МНН.
                  </p>
                ) : (
                  <div role="listbox">
                    {tradeRows.map((trade) => {
                      const variant = trade.variants?.[0];
                      return (
                        <button
                          key={trade.trade}
                          type="button"
                          className="preparaty__option"
                          onClick={() =>
                            pickTrade(trade.trade, variant?.dose, variant?.form)
                          }
                        >
                          {trade.trade}
                          {variant?.dose || variant?.form ? (
                            <small>
                              {[variant?.dose, variant?.form]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="preparaty__scheme-work-title">
                  Выберите действующее вещество
                </p>
                <div role="listbox">
                  {inns.map((alt) => (
                    <button
                      key={alt.inn}
                      type="button"
                      className="preparaty__option"
                      onClick={() => pickInn(alt.inn)}
                    >
                      {alt.label}
                      <small>{alt.inn}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="preparaty__scheme-foot">
            <button
              type="button"
              className="preparaty__scheme-btn preparaty__scheme-btn--ghost"
              onClick={onClose}
            >
              Отмена
            </button>
            <div className="preparaty__scheme-foot-actions">
              <button
                type="button"
                className="preparaty__scheme-btn"
                disabled={step === 0 && !isReview}
                onClick={() => {
                  if (isReview) {
                    setStage("pick");
                    setStep(0);
                    return;
                  }
                  setStep((value) => Math.max(0, value - 1));
                  setStage("pick");
                }}
              >
                {isReview ? "К началу" : "Назад"}
              </button>
              {isReview || ready >= components.length ? (
                <button
                  type="button"
                  className="preparaty__scheme-btn preparaty__scheme-btn--primary"
                  disabled={ready < components.length}
                  onClick={() => onDone(picks)}
                >
                  Готово
                </button>
              ) : (
                <button
                  type="button"
                  className="preparaty__scheme-btn preparaty__scheme-btn--primary"
                  disabled={!picks[current?.id ?? ""]}
                  onClick={() => {
                    if (step >= components.length - 1) {
                      setStage("review");
                      return;
                    }
                    setStep((value) => value + 1);
                    setStage("pick");
                  }}
                >
                  Далее
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MiniCartPortal>
  );
}

function ProductionSchemeModal({
  item,
  components,
  confirmed,
  onClose,
  onConfirm,
}: {
  item: MiniCartCatalogItem;
  components: readonly MedsCatalogComponent[];
  confirmed: CombinationDraft | null;
  onClose: () => void;
  onConfirm: (draft: CombinationDraft) => void;
}) {
  const { ownerDocument } = useMiniCartPortal();
  const [state, setState] = useState<CombinationWizardState>(() =>
    createCombinationWizard(components, confirmed),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    ownerDocument.addEventListener("keydown", handleKeyDown);
    return () => ownerDocument.removeEventListener("keydown", handleKeyDown);
  }, [onClose, ownerDocument]);

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

  const tradeCards =
    !component || component.type === "other"
      ? []
      : tradeItemsOf(
          component,
          component.type === "group" ? pick?.inn ?? "" : "",
        );

  return (
    <MiniCartPortal>
      <div className="preparaty__scheme-layer" role="presentation">
        <div
          className="preparaty__scheme-backdrop"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          className="preparaty__scheme-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Настройка схемы"
        >
          <div className="preparaty__scheme-head">
            <div>
              <h2>{item.name}</h2>
              <p>{combinationPrompt(components.length)}</p>
              <div className="preparaty__scheme-progress">{progress}</div>
            </div>
            <button
              type="button"
              className="preparaty__info-close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="preparaty__scheme-slots">
            {components.map((entry, index) => {
              const chosen = isComponentChosen(entry, state.draft.picks[index]);
              const active = !isReview && step === index;
              return (
                <button
                  key={`${entry.name}-${index}`}
                  type="button"
                  className={`preparaty__scheme-slot${
                    active ? " is-active" : ""
                  }${chosen ? " is-done" : ""}`}
                  onClick={() =>
                    setState((current) =>
                      goToCombinationStep(current, components, index),
                    )
                  }
                >
                  <span className="preparaty__scheme-slot-num">{index + 1}</span>
                  <span className="preparaty__scheme-slot-body">
                    <strong>{entry.name}</strong>
                    <span>
                      {combinationSlotText(entry, state.draft.picks[index])}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="preparaty__scheme-work">
            {isReview ? (
              <>
                <p className="preparaty__scheme-work-title">
                  Проверьте выбранные препараты
                </p>
                <div className="preparaty__scheme-review">
                  {components.map((entry, index) => {
                    const card = combinationReviewCard(
                      entry,
                      state.draft.picks[index],
                    );
                    return (
                      <div
                        key={`${entry.name}-${index}`}
                        className="preparaty__scheme-review-row"
                      >
                        <span className="preparaty__scheme-slot-num">
                          {index + 1}
                        </span>
                        <div>
                          <strong>{card.title}</strong>
                          {card.details.length > 0 ? (
                            <small>{card.details.join(" · ")}</small>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : component ? (
              <>
                <p className="preparaty__scheme-work-title">{workTitle()}</p>
                {component.type === "group" && stage === "items" ? (
                  <button
                    type="button"
                    className="preparaty__scheme-btn preparaty__scheme-btn--ghost"
                    onClick={() =>
                      setState((current) =>
                        showCombinationInnList(current, components),
                      )
                    }
                  >
                    ← Действующее вещество
                  </button>
                ) : null}
                {component.type === "group" && stage === "inn" ? (
                  <div role="listbox">
                    {sortedRuLabels(innsOf(component)).map((inn) => (
                      <button
                        key={inn}
                        type="button"
                        className={`preparaty__option${
                          pick?.inn === inn ? " is-selected" : ""
                        }`}
                        onClick={() =>
                          setState((current) =>
                            chooseCombinationInn(current, components, inn),
                          )
                        }
                      >
                        {inn}
                      </button>
                    ))}
                  </div>
                ) : null}
                {component.type !== "other" && stage === "items" ? (
                  tradeCards.length > 0 ? (
                    <div role="listbox">
                      {sortedTradeChoices(tradeCards).map(
                        ({ item: tradeItem, sourceIndex }) => {
                          const card = catalogItemCard(
                            tradeItem,
                            component.name,
                          );
                          const selected = Boolean(
                            pick?.item &&
                              sameCatalogItem(pick.item, tradeItem),
                          );
                          return (
                            <button
                              key={`${tradeItem.name_trade}-${tradeItem.standard_dose}-${tradeItem.standard_form}-${tradeItem.SMNN_code}-${sourceIndex}`}
                              type="button"
                              className={`preparaty__option${
                                selected ? " is-selected" : ""
                              }`}
                              aria-pressed={selected}
                              onClick={() =>
                                setState((current) =>
                                  chooseCombinationTrade(
                                    current,
                                    components,
                                    sourceIndex,
                                  ),
                                )
                              }
                            >
                              {card.title}
                              {card.details.length > 0 ? (
                                <small>{card.details.join(" · ")}</small>
                              ) : null}
                            </button>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <p className="preparaty__scheme-empty">
                      {component.type === "group"
                        ? "В текущей выборке нет торговых наименований для этого МНН."
                        : "В текущей выборке нет торговых наименований."}
                    </p>
                  )
                ) : null}
                {component.type === "other" ? (
                  <div>
                    <p>{component.name}</p>
                    {component.data[0]?.name.trim() &&
                    component.data[0].name.trim() !== component.name.trim() ? (
                      <p>{component.data[0].name}</p>
                    ) : null}
                    <button
                      type="button"
                      className="preparaty__scheme-btn preparaty__scheme-btn--primary"
                      onClick={() =>
                        setState((current) =>
                          confirmCombinationOther(current, components),
                        )
                      }
                    >
                      Подтвердить
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="preparaty__scheme-empty">
                Компоненты схемы не заданы.
              </p>
            )}
          </div>

          <div className="preparaty__scheme-foot">
            <button
              type="button"
              className="preparaty__scheme-btn preparaty__scheme-btn--ghost"
              onClick={onClose}
            >
              Отмена
            </button>
            <div className="preparaty__scheme-foot-actions">
              <button
                type="button"
                className="preparaty__scheme-btn"
                disabled={!canBack}
                onClick={() =>
                  setState((current) => goBackCombination(current, components))
                }
              >
                Назад
              </button>
              {isReview ? (
                <button
                  type="button"
                  className="preparaty__scheme-btn"
                  onClick={() =>
                    setState(restartCombinationWizard(components))
                  }
                >
                  К началу
                </button>
              ) : null}
              {isReview ? (
                <button
                  type="button"
                  className="preparaty__scheme-btn preparaty__scheme-btn--primary"
                  disabled={!canCommit}
                  onClick={finish}
                >
                  Готово
                </button>
              ) : (
                <button
                  type="button"
                  className="preparaty__scheme-btn preparaty__scheme-btn--primary"
                  disabled={!canAdvance}
                  onClick={() =>
                    setState((current) =>
                      goNextCombination(current, components),
                    )
                  }
                >
                  Далее
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MiniCartPortal>
  );
}

export default function MiniCartSchemeModal({
  item,
  trades,
  combinationComponents,
  confirmedDraft = null,
  onClose,
  onDone,
  onConfirmCombination,
}: MiniCartSchemeModalProps) {
  if (combinationComponents && combinationComponents.length > 0 && onConfirmCombination) {
    return (
      <ProductionSchemeModal
        item={item}
        components={combinationComponents}
        confirmed={confirmedDraft}
        onClose={onClose}
        onConfirm={onConfirmCombination}
      />
    );
  }

  return (
    <DemoSchemeModal
      item={item}
      trades={trades}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

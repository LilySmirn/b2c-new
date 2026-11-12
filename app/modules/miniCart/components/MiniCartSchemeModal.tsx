"use client";

import { useMemo, useState } from "react";
import type {
  MiniCartCatalogItem,
  MiniCartComponentPick,
  MiniCartTradesBook,
} from "../types";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartSchemeModalProps = {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  onClose: () => void;
  onDone: (picks: Record<string, MiniCartComponentPick>) => void;
};

export default function MiniCartSchemeModal({
  item,
  trades,
  onClose,
  onDone,
}: MiniCartSchemeModalProps) {
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
              Выберите 3 отдельных препарата: сначала действующее вещество, затем
              торговое наименование.
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
              <p className="preparaty__scheme-work-title">Проверьте выбранные компоненты</p>
              <div className="preparaty__scheme-review">
                {components.map((component, index) => {
                  const pick = picks[component.id];
                  return (
                    <div key={component.id} className="preparaty__scheme-review-row">
                      <span className="preparaty__scheme-slot-num">{index + 1}</span>
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

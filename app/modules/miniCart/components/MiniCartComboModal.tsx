"use client";

import { useMemo, useState } from "react";
import type { MiniCartCatalogItem, MiniCartTradesBook } from "../types";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartComboModalProps = {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  onClose: () => void;
  onDone: (pick: { inn: string; trade: string }) => void;
};

export default function MiniCartComboModal({
  item,
  trades,
  onClose,
  onDone,
}: MiniCartComboModalProps) {
  const [stage, setStage] = useState<"kits" | "trades" | "review">(
    item.selectedTrade ? "review" : "kits",
  );
  const [inn, setInn] = useState(item.selectedInn || "");
  const [trade, setTrade] = useState(item.selectedTrade || "");

  const alternatives = item.alternatives ?? [];
  const selectedAlt = alternatives.find((alt) => alt.inn === inn);
  const composition =
    selectedAlt?.composition ??
    item.composition ??
    ["ДВ 1", "ДВ 2", "ДВ 3"];

  const tradeRows = useMemo(
    () => trades[inn]?.trades ?? [],
    [inn, trades],
  );

  return (
    <MiniCartPortal>
    <div
      className="preparaty__scheme-layer preparaty__scheme-layer--combo"
      role="presentation"
    >
      <div
        className="preparaty__scheme-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        className="preparaty__scheme-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Выбор комбинации"
      >
        <div className="preparaty__scheme-head">
          <div>
            <h2>{item.name}</h2>
            <p>
              Готовый набор: несколько действующих веществ в одной упаковке.
              Выберите комбинированный продукт.
            </p>
            <div className="preparaty__scheme-progress">
              {stage === "kits"
                ? "Шаг 1 · выбор набора"
                : stage === "trades"
                  ? "Шаг 2 · торговое наименование"
                  : "Итог"}
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
          {composition.slice(0, 3).map((label, index) => (
            <div key={`${label}-${index}`} className="preparaty__scheme-slot is-done">
              <span className="preparaty__scheme-slot-num">{index + 1}</span>
              <span className="preparaty__scheme-slot-body">
                <strong>{label}</strong>
              </span>
            </div>
          ))}
        </div>

        <div className="preparaty__scheme-work">
          {stage === "review" ? (
            <>
              <p className="preparaty__scheme-work-title">Проверьте выбранный набор</p>
              <div className="preparaty__scheme-review">
                <div className="preparaty__scheme-review-row">
                  <span className="preparaty__scheme-slot-num">✓</span>
                  <div>
                    <strong>{trade || "—"}</strong>
                    <small>
                      {selectedAlt?.label || inn}
                      {composition.length ? ` · ${composition.join(" + ")}` : ""}
                    </small>
                  </div>
                </div>
              </div>
            </>
          ) : stage === "trades" ? (
            <>
              <p className="preparaty__scheme-work-title">
                Шаг 2 · выберите торговое наименование набора «
                {selectedAlt?.label || inn}»
              </p>
              {tradeRows.length === 0 ? (
                <div role="listbox">
                  <button
                    type="button"
                    className="preparaty__option"
                    onClick={() => {
                      const label = selectedAlt?.label || inn;
                      setTrade(label);
                      setStage("review");
                    }}
                  >
                    {selectedAlt?.label || inn}
                    <small>использовать название набора</small>
                  </button>
                </div>
              ) : (
                <div role="listbox">
                  {tradeRows.map((row) => (
                    <button
                      key={row.trade}
                      type="button"
                      className="preparaty__option"
                      onClick={() => {
                        setTrade(row.trade);
                        setStage("review");
                      }}
                    >
                      {row.trade}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="preparaty__scheme-work-title">
                Шаг 1 · выберите комбинированный набор (3 действующих вещества в
                одной упаковке)
              </p>
              <div role="listbox">
                {alternatives.map((alt) => (
                  <button
                    key={alt.inn}
                    type="button"
                    className={`preparaty__option${
                      alt.inn === inn ? " is-current" : ""
                    }`}
                    onClick={() => {
                      setInn(alt.inn);
                      setStage("trades");
                    }}
                  >
                    {alt.label}
                    <small>
                      {(alt.composition ?? []).join(" + ") || "комбинация · 3 ДВ"}
                    </small>
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
              onClick={() => {
                if (stage === "review") {
                  setStage("kits");
                  return;
                }
                if (stage === "trades") {
                  setStage("kits");
                  return;
                }
                onClose();
              }}
            >
              {stage === "kits" ? "Закрыть" : "Назад"}
            </button>
            <button
              type="button"
              className="preparaty__scheme-btn preparaty__scheme-btn--primary"
              disabled={!inn || !trade}
              onClick={() => {
                if (stage !== "review") {
                  setStage("review");
                  return;
                }
                onDone({ inn, trade });
              }}
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    </div>
    </MiniCartPortal>
  );
}

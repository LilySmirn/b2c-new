"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { MiniCartCatalogItem, MiniCartTradesBook } from "../types";
import MiniCartPortal from "./MiniCartPortal";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";

type MiniCartTradePopoverProps = {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  onPick: (pick: {
    inn: string;
    trade: string;
    dose?: string;
    form?: string;
  }) => void;
};

export default function MiniCartTradePopover({
  item,
  trades,
  anchorEl,
  onClose,
  onPick,
}: MiniCartTradePopoverProps) {
  const { ownerDocument, isPip } = useMiniCartPortal();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 1300,
  });

  useLayoutEffect(() => {
    const pop = popoverRef.current;
    const view = ownerDocument.defaultView;
    if (!pop || !view) return;

    if (!anchorEl) {
      setStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1300,
        width: Math.min(340, view.innerWidth - 16),
        maxHeight: Math.min(320, view.innerHeight - 16),
      });
      return;
    }

    const anchorRect = anchorEl.getBoundingClientRect();
    const gap = 6;
    const vw = view.innerWidth;
    const vh = view.innerHeight;
    const width = Math.min(340, vw - 16);
    const maxHeight = Math.min(320, vh - 16);

    pop.style.width = `${width}px`;
    pop.style.maxHeight = `${maxHeight}px`;
    const popRect = pop.getBoundingClientRect();

    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;

    if (top + popRect.height > vh - 8) {
      top = Math.max(8, anchorRect.top - popRect.height - gap);
    }
    if (left + width > vw - 8) {
      left = Math.max(8, vw - width - 8);
    }
    if (left < 8) left = 8;

    setStyle({
      position: "fixed",
      top,
      left,
      transform: "none",
      zIndex: 1300,
      width,
      maxHeight,
    });
  }, [anchorEl, ownerDocument, item.id, isPip]);

  useLayoutEffect(() => {
    const doc = ownerDocument;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [anchorEl, onClose, ownerDocument]);

  const alternatives =
    item.kind === "alternatives"
      ? item.alternatives ?? []
      : item.inn
        ? [{ inn: item.inn, label: item.name }]
        : [];

  const inns =
    alternatives.length > 0
      ? alternatives
      : Object.keys(trades).map((inn) => ({
          inn,
          label: inn,
        }));

  const headLabel =
    item.kind === "alternatives"
      ? "Альтернативы · торговое наименование"
      : "Торговые наименования";

  return (
    <MiniCartPortal>
      <div
        ref={popoverRef}
        className="preparaty__popover"
        aria-label="Торговые наименования"
        style={style}
      >
        <div className="preparaty__popover-head">
          <strong>{headLabel}</strong>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        <div role="listbox" aria-label="Торговые наименования">
          {inns.length === 0 ? (
            <div className="preparaty__popover-body">
              <p className="preparaty__empty">Нет вариантов в демо-данных.</p>
            </div>
          ) : (
            inns.flatMap((row) => {
              const book = trades[row.inn];
              const tradeRows = book?.trades ?? [];
              if (tradeRows.length === 0) {
                return [
                  <button
                    key={row.inn}
                    type="button"
                    className={`preparaty__option${
                      row.inn === item.selectedInn ? " is-current" : ""
                    }`}
                    onClick={() =>
                      onPick({
                        inn: row.inn,
                        trade: row.label || row.inn,
                      })
                    }
                  >
                    {row.label || row.inn}
                    <small>{row.inn}</small>
                  </button>,
                ];
              }

              return tradeRows.map((trade) => {
                const variant = trade.variants?.[0];
                const meta = [variant?.dose, variant?.form]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <button
                    key={`${row.inn}-${trade.trade}`}
                    type="button"
                    className={`preparaty__option${
                      trade.trade === item.selectedTrade ? " is-current" : ""
                    }`}
                    onClick={() =>
                      onPick({
                        inn: row.inn,
                        trade: trade.trade,
                        dose: variant?.dose,
                        form: variant?.form,
                      })
                    }
                  >
                    {trade.trade}
                    <small>
                      {[row.label || row.inn, meta].filter(Boolean).join(" · ")}
                    </small>
                  </button>
                );
              });
            })
          )}
        </div>
      </div>
    </MiniCartPortal>
  );
}

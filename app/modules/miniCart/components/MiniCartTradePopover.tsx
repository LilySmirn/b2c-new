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
      });
      return;
    }

    const anchorRect = anchorEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const gap = 6;
    const vw = view.innerWidth;
    const vh = view.innerHeight;

    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;

    if (top + popRect.height > vh - 8) {
      top = Math.max(8, anchorRect.top - popRect.height - gap);
    }
    if (left + popRect.width > vw - 8) {
      left = Math.max(8, vw - popRect.width - 8);
    }
    if (left < 8) left = 8;

    setStyle({
      position: "fixed",
      top,
      left,
      transform: "none",
      zIndex: 1300,
      width: Math.min(340, vw - 16),
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

  return (
    <MiniCartPortal>
      <div
        ref={popoverRef}
        className="preparaty__popover"
        role="listbox"
        aria-label="Торговые наименования"
        style={style}
      >
        <div className="preparaty__popover-head">
          <strong>Выбор препарата</strong>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="preparaty__popover-body">
          {inns.length === 0 ? (
            <p className="preparaty__empty">Нет вариантов в демо-данных.</p>
          ) : (
            inns.map((row) => {
              const book = trades[row.inn];
              const tradeRows = book?.trades ?? [];
              return (
                <div key={row.inn} className="preparaty__popover-group">
                  <div className="preparaty__popover-group-title">
                    {row.label || row.inn}
                  </div>
                  {tradeRows.length === 0 ? (
                    <button
                      type="button"
                      className="preparaty__popover-option"
                      onClick={() =>
                        onPick({
                          inn: row.inn,
                          trade: row.label || row.inn,
                        })
                      }
                    >
                      {row.label || row.inn}
                    </button>
                  ) : (
                    tradeRows.map((trade) => {
                      const variant = trade.variants?.[0];
                      return (
                        <button
                          key={`${row.inn}-${trade.trade}`}
                          type="button"
                          className="preparaty__popover-option"
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
                          {variant?.dose || variant?.form ? (
                            <span>
                              {[variant?.dose, variant?.form]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </MiniCartPortal>
  );
}

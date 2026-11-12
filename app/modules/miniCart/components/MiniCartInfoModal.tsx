import { displayName } from "../lib/display";
import type { MiniCartCatalogItem } from "../types";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartInfoModalProps = {
  item: MiniCartCatalogItem;
  onClose: () => void;
};

export default function MiniCartInfoModal({ item, onClose }: MiniCartInfoModalProps) {
  const dose = item.selectedDose?.trim() || "";
  const form = item.selectedForm?.trim() || "";
  const componentEntries = Object.entries(item.componentPicks ?? {});

  return (
    <MiniCartPortal>
    <div className="preparaty__info-layer" role="presentation">
      <div className="preparaty__info-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        className="preparaty__info-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Информация о назначении"
      >
        <div className="preparaty__info-head">
          <div>
            <h2>{displayName(item)}</h2>
            <p>
              {[item.qc, item.level].filter(Boolean).join(" · ") || "Назначение"}
            </p>
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
        <div className="preparaty__info-body">
          <p>{item.hint || "Дополнительное описание отсутствует."}</p>
          {item.selectedInn ? (
            <>
              <h3>МНН</h3>
              <p>{item.selectedInn}</p>
            </>
          ) : null}
          {item.selectedTrade && item.kind !== "scheme" ? (
            <>
              <h3>Торговое наименование</h3>
              <p>{item.selectedTrade}</p>
            </>
          ) : null}
          {dose ? (
            <>
              <h3>Доза</h3>
              <p>{dose}</p>
            </>
          ) : null}
          {form ? (
            <>
              <h3>Форма</h3>
              <p>{form}</p>
            </>
          ) : null}
          {item.scheme ? (
            <>
              <h3>Схема</h3>
              <p>{item.scheme}</p>
            </>
          ) : null}
          {item.course ? (
            <>
              <h3>Курс</h3>
              <p>{item.course}</p>
            </>
          ) : null}
          {componentEntries.length > 0 ? (
            <>
              <h3>Компоненты схемы</h3>
              <ul>
                {componentEntries.map(([componentId, pick]) => {
                  const component = item.components?.find((row) => row.id === componentId);
                  const label = component?.label || componentId;
                  const details = [pick.trade || pick.inn, pick.dose, pick.form]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={componentId}>
                      <strong>{label}</strong>
                      {details ? ` — ${details}` : ""}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
    </MiniCartPortal>
  );
}

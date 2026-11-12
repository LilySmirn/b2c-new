import { displayName } from "../lib/display";
import type { MiniCartCatalogItem, MiniCartMedsField } from "../types";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartInfoModalProps = {
  item: MiniCartCatalogItem;
  onClose: () => void;
  editable?: boolean;
  onChangeField?: (field: MiniCartMedsField, value: string) => void;
};

export default function MiniCartInfoModal({
  item,
  onClose,
  editable = false,
  onChangeField,
}: MiniCartInfoModalProps) {
  const dose = item.selectedDose ?? "";
  const form = item.selectedForm ?? "";
  const scheme = item.scheme ?? "";
  const course = item.course ?? "";
  const componentEntries = Object.entries(item.componentPicks ?? {});

  const field = (
    id: MiniCartMedsField,
    label: string,
    value: string,
  ) => {
    if (!editable || !onChangeField) {
      if (!value.trim()) return null;
      return (
        <>
          <h3>{label}</h3>
          <p>{value}</p>
        </>
      );
    }

    return (
      <>
        <h3>{label}</h3>
        <input
          className="preparaty__note-text"
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 8 }}
          value={value}
          aria-label={label}
          onChange={(event) => onChangeField(id, event.target.value)}
        />
      </>
    );
  };

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
          {field("dose", "Доза", dose)}
          {field("form", "Форма", form)}
          {field("scheme", "Схема", scheme)}
          {field("course", "Курс", course)}
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

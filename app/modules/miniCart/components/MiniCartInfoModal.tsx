import { displayName } from "../lib/display";
import type { MiniCartCatalogItem, MiniCartMedsField } from "../types";
import MiniCartPortal from "./MiniCartPortal";
import "../styles/miniCartInfoModal.css";

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
  const showQc = Boolean(item.qc?.trim());
  const showLevel = Boolean(item.level?.trim());

  const field = (
    id: MiniCartMedsField,
    label: string,
    value: string,
  ) => {
    if (!editable || !onChangeField) {
      if (!value.trim()) return null;
      return (
        <div className="preparaty__card-block">
          <h4>{label}</h4>
          <p>{value}</p>
        </div>
      );
    }

    return (
      <label className="preparaty__card-field preparaty__card-field--wide">
        <span>{label}</span>
        <input
          value={value}
          aria-label={label}
          onChange={(event) => onChangeField(id, event.target.value)}
        />
      </label>
    );
  };

  return (
    <MiniCartPortal>
      <div className="preparaty__info-layer" role="presentation">
        <div
          className="preparaty__info-backdrop"
          aria-hidden="true"
          onClick={onClose}
        />
        <div
          className="preparaty__info-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Информация о назначении"
        >
          <div className="preparaty__card-head">
            <div className="preparaty__card-head-main">
              <h2>{displayName(item)}</h2>
              {showQc || showLevel ? (
                <div className="preparaty__card-badges">
                  {showQc ? (
                    <span className="preparaty__card-badge">{item.qc}</span>
                  ) : null}
                  {showLevel ? (
                    <span className="preparaty__card-badge">{item.level}</span>
                  ) : null}
                </div>
              ) : null}
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
          <div className="preparaty__note-body">
            <div className="preparaty__card-block">
              <h4>Описание</h4>
              <p>{item.hint || "Дополнительное описание отсутствует."}</p>
            </div>
            {item.selectedInn ? (
              <div className="preparaty__card-block">
                <h4>МНН</h4>
                <p>{item.selectedInn}</p>
              </div>
            ) : null}
            {item.selectedTrade && item.kind !== "scheme" ? (
              <div className="preparaty__card-block">
                <h4>Торговое наименование</h4>
                <p>{item.selectedTrade}</p>
              </div>
            ) : null}
            {field("dose", "Доза", dose)}
            {field("form", "Форма", form)}
            {field("scheme", "Схема", scheme)}
            {field("course", "Курс", course)}
            {componentEntries.length > 0 ? (
              <div className="preparaty__card-block">
                <h4>Компоненты схемы</h4>
                <ul className="preparaty__info-list">
                  {componentEntries.map(([componentId, pick]) => {
                    const component = item.components?.find(
                      (row) => row.id === componentId,
                    );
                    const label = component?.label || componentId;
                    const details = [
                      pick.trade || pick.inn,
                      pick.dose,
                      pick.form,
                    ]
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
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </MiniCartPortal>
  );
}

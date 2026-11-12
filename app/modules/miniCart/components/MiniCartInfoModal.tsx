import { displayName } from "../lib/display";
import type { MiniCartCatalogItem } from "../types";

type MiniCartInfoModalProps = {
  item: MiniCartCatalogItem;
  onClose: () => void;
};

export default function MiniCartInfoModal({ item, onClose }: MiniCartInfoModalProps) {
  return (
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
          <p>{item.hint || "Дополнительное описание отсутствует в демо-данных."}</p>
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
        </div>
      </div>
    </div>
  );
}

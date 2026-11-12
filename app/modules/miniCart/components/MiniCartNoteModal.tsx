import MiniCartPortal from "./MiniCartPortal";

type MiniCartNoteModalProps = {
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function MiniCartNoteModal({
  title,
  subtitle,
  value,
  onChange,
  onClose,
  onSave,
}: MiniCartNoteModalProps) {
  return (
    <MiniCartPortal>
    <div className="preparaty__note-layer" role="presentation">
      <div className="preparaty__note-backdrop" aria-hidden="true" onClick={onClose} />
      <div className="preparaty__note-dialog" role="dialog" aria-modal="true" aria-label="Комментарий">
        <div className="preparaty__note-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
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
          <label className="preparaty__note-label" htmlFor="mini-cart-note-text">
            Текст комментария
          </label>
          <textarea
            id="mini-cart-note-text"
            className="preparaty__note-text"
            rows={6}
            placeholder="Напишите комментарий к назначению..."
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <div className="preparaty__note-foot">
          <button
            type="button"
            className="preparaty__scheme-btn preparaty__scheme-btn--ghost"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="preparaty__scheme-btn preparaty__scheme-btn--primary"
            onClick={onSave}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
    </MiniCartPortal>
  );
}

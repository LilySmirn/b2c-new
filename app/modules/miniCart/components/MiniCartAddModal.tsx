import { useState } from "react";

type MiniCartAddModalProps = {
  onClose: () => void;
  onSave: (name: string) => void;
};

export default function MiniCartAddModal({ onClose, onSave }: MiniCartAddModalProps) {
  const [name, setName] = useState("");

  return (
    <div className="preparaty__cart-modal-layer" role="presentation">
      <div className="preparaty__cart-modal-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        className="preparaty__cart-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Добавить услугу или медикамент"
      >
        <div className="preparaty__cart-modal-head">
          <h2>Добавить услугу/медикамент</h2>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="preparaty__cart-modal-body">
          <label className="preparaty__cart-modal-step">
            Наименование
            <input
              className="preparaty__cart-modal-input"
              type="text"
              value={name}
              placeholder="Например: Гастроскопия"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        </div>
        <div className="preparaty__cart-modal-actions">
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
            disabled={!name.trim()}
            onClick={() => {
              if (!name.trim()) return;
              onSave(name.trim());
            }}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

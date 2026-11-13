"use client";

import { useEffect, useMemo, useState } from "react";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import {
  CUSTOM_ITEM_COMMENT_MAX_LENGTH,
  CUSTOM_ITEM_NAME_MAX_LENGTH,
  normalizeCustomItemValues,
  validateCustomItemName,
} from "../lib/customItems";
import MiniCartPortal from "./MiniCartPortal";

export type MiniCartAddModalSubmit = {
  name: string;
  comment: string;
};

type MiniCartAddModalProps = {
  mode: "add" | "edit";
  initialName?: string;
  initialComment?: string;
  onClose: () => void;
  onSubmit: (values: MiniCartAddModalSubmit) => void;
};

export default function MiniCartAddModal({
  mode,
  initialName = "",
  initialComment = "",
  onClose,
  onSubmit,
}: MiniCartAddModalProps) {
  const { ownerDocument } = useMiniCartPortal();
  const [name, setName] = useState(initialName);
  const [comment, setComment] = useState(initialComment);
  const [touched, setTouched] = useState(false);

  const validationError = useMemo(
    () => validateCustomItemName(name),
    [name],
  );
  const visibleError = touched ? validationError : "";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const view = ownerDocument.defaultView;
    view?.addEventListener("keydown", handleKeyDown);
    return () => view?.removeEventListener("keydown", handleKeyDown);
  }, [onClose, ownerDocument]);

  const handleSubmit = () => {
    setTouched(true);
    const normalized = normalizeCustomItemValues({ name, comment });
    if (!normalized) return;
    onSubmit(normalized);
  };

  const title =
    mode === "add" ? "Добавить услугу/медикамент" : "Редактировать услугу/медикамент";
  const submitText = mode === "add" ? "Добавить" : "Сохранить";

  return (
    <MiniCartPortal>
      <div
        className="preparaty__cart-modal-layer"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="preparaty__cart-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="preparaty__cart-modal-head">
            <h3>{title}</h3>
            <button
              type="button"
              className="preparaty__cart-modal-close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div className="preparaty__cart-modal-scroll">
            <p className="preparaty__cart-modal-lead">
              Услуга или произвольная позиция — в группу «Прочее».
            </p>
            <label className="preparaty__cart-modal-field">
              <span>Наименование</span>
              <input
                className={`preparaty__cart-modal-input${
                  visibleError ? " is-error" : ""
                }`}
                type="text"
                value={name}
                placeholder="Введите название*"
                maxLength={CUSTOM_ITEM_NAME_MAX_LENGTH}
                aria-label="Название услуги или медикамента"
                aria-invalid={Boolean(visibleError)}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                onBlur={() => setTouched(true)}
              />
            </label>
            <div className="preparaty__cart-modal-helper">
              <span className={visibleError ? "is-error" : ""}>
                {visibleError || "Обязательное поле"}
              </span>
              <span>
                {name.length}/{CUSTOM_ITEM_NAME_MAX_LENGTH}
              </span>
            </div>
            <label className="preparaty__cart-modal-field">
              <span>Комментарий</span>
              <textarea
                className="preparaty__cart-modal-textarea"
                value={comment}
                placeholder="Комментарий..."
                maxLength={CUSTOM_ITEM_COMMENT_MAX_LENGTH}
                rows={3}
                aria-label="Комментарий"
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
            <div className="preparaty__cart-modal-helper">
              <span>Необязательное поле</span>
              <span>
                {comment.length}/{CUSTOM_ITEM_COMMENT_MAX_LENGTH}
              </span>
            </div>
          </div>
          <div className="preparaty__cart-modal-actions">
            <button
              type="button"
              className="preparaty__cart-modal-btn preparaty__cart-modal-btn--secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="button"
              className="preparaty__cart-modal-btn preparaty__cart-modal-btn--primary"
              disabled={Boolean(validationError)}
              onClick={handleSubmit}
            >
              {submitText}
            </button>
          </div>
        </div>
      </div>
    </MiniCartPortal>
  );
}

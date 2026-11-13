"use client";

import type { MiniCartCustomItem } from "../types";
import "../styles/miniCartCustomItems.css";

type MiniCartCustomItemsScreenProps = {
  items: readonly MiniCartCustomItem[];
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  onDone: () => void;
  onAdd: () => void;
  onEdit: (itemId: string) => void;
  onDelete: (itemId: string) => void;
};

export default function MiniCartCustomItemsScreen({
  items,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onBack,
  onDone,
  onAdd,
  onEdit,
  onDelete,
}: MiniCartCustomItemsScreenProps) {
  const count = items.length;

  return (
    <div
      className="preparaty__custom-items"
      aria-label={`Дополнительно, ${count}`}
    >
      <div className="preparaty__custom-items-top">
        <button type="button" className="preparaty__drug-back" onClick={onBack}>
          ‹ Назад
        </button>
        <h2 className="preparaty__custom-items-title">
          Дополнительно ({count})
        </h2>
        <p className="preparaty__custom-items-lead">
          Назначения, добавленные врачом
        </p>
      </div>

      <div className="preparaty__custom-items-scroll">
        {count === 0 ? (
          <p className="preparaty__custom-items-empty">
            Дополнительные назначения пока не добавлены
          </p>
        ) : (
          <ul className="preparaty__custom-items-list">
            {items.map((item) => {
              const comment = item.comment.trim();
              return (
                <li key={item.id} className="preparaty__custom-items-row">
                  <div className="preparaty__custom-items-main">
                    <span className="preparaty__custom-items-name">
                      {item.name}
                    </span>
                    {comment ? (
                      <span className="preparaty__custom-items-comment">
                        {comment}
                      </span>
                    ) : null}
                  </div>
                  <div className="preparaty__custom-items-actions">
                    {canEdit ? (
                      <button
                        type="button"
                        className="preparaty__custom-edit"
                        aria-label={`Редактировать ${item.name}`}
                        onClick={() => onEdit(item.id)}
                      >
                        ✎
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className="preparaty__custom-delete"
                        aria-label={`Удалить ${item.name}`}
                        onClick={() => onDelete(item.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="preparaty__mini-panel-add preparaty__custom-items-add"
          onClick={onAdd}
          disabled={!canAdd}
          aria-disabled={!canAdd}
        >
          <span aria-hidden="true">+</span>
          <span>Добавить услугу/медикамент</span>
        </button>
      </div>

      <div className="preparaty__custom-items-foot">
        <button
          type="button"
          className="preparaty__drug-done"
          onClick={onDone}
        >
          Готово
        </button>
      </div>
    </div>
  );
}

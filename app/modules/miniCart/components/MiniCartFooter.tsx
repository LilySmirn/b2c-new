type MiniCartFooterProps = {
  recommendation: string;
  onRecommendationChange: (value: string) => void;
  onAddClick: () => void;
  onOpenCustomItems: () => void;
  customItemsCount: number;
  onWrite?: () => void;
  onCopy?: (targetDocument: Document) => void;
  canAdd?: boolean;
  canEditRecommendation?: boolean;
};

export default function MiniCartFooter({
  recommendation,
  onRecommendationChange,
  onAddClick,
  onOpenCustomItems,
  customItemsCount,
  onWrite,
  onCopy,
  canAdd = true,
  canEditRecommendation = true,
}: MiniCartFooterProps) {
  return (
    <div className="preparaty__mini-panel-foot">
      <div className="preparaty__mini-panel-add-row">
        <button
          type="button"
          className="preparaty__mini-panel-add"
          onClick={onAddClick}
          disabled={!canAdd}
          aria-disabled={!canAdd}
        >
          <span aria-hidden="true">+</span>
          <span>Добавить услугу/медикамент</span>
        </button>
        <button
          type="button"
          className="preparaty__mini-panel-extra"
          onClick={onOpenCustomItems}
          aria-label={`Дополнительно, ${customItemsCount}`}
        >
          Дополнительно ({customItemsCount})
        </button>
      </div>
      <textarea
        className="preparaty__cart-note preparaty__mini-rec"
        rows={1}
        placeholder="Напишите общую рекомендацию для пациента..."
        aria-label="Общая рекомендация для пациента"
        value={recommendation}
        readOnly={!canEditRecommendation}
        onChange={(event) => onRecommendationChange(event.target.value)}
      />
      <div className="preparaty__mini-panel-actions">
        <button type="button" className="preparaty__cart-btn" onClick={onWrite} disabled>
          <svg
            className="preparaty__cart-btn-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M4 2h9l3 3v13H4V2zm8 1.5V6h2.5L12 3.5zM6 9h8v1.5H6V9zm0 3h8v1.5H6V12zm0 3h5V16.5H6V15z"
            />
          </svg>
          <span className="preparaty__cart-btn-label">
            <span>Запись</span>
            <span>в карту</span>
          </span>
        </button>
        <button
          type="button"
          className="preparaty__cart-btn"
          onClick={(event) => onCopy?.(event.currentTarget.ownerDocument)}
          disabled={!onCopy}
        >
          <svg
            className="preparaty__cart-btn-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M7 2h9v12h-1.5V3.5H7V2zm-3 3h9v13H4V5zm1.5 1.5v10h6v-10h-6z"
            />
          </svg>
          <span className="preparaty__cart-btn-label">
            <span>Скопировать</span>
            <span>выбранное</span>
          </span>
        </button>
      </div>
    </div>
  );
}

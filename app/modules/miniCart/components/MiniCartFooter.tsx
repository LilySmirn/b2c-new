type MiniCartFooterProps = {
  recommendation: string;
  onRecommendationChange: (value: string) => void;
  onAddClick: () => void;
  onWrite?: () => void;
  onCopy?: () => void;
};

export default function MiniCartFooter({
  recommendation,
  onRecommendationChange,
  onAddClick,
  onWrite,
  onCopy,
}: MiniCartFooterProps) {
  return (
    <div className="preparaty__mini-panel-foot">
      <button type="button" className="preparaty__mini-panel-add" onClick={onAddClick}>
        <span aria-hidden="true">+</span>
        <span>Добавить услугу/медикамент</span>
      </button>
      <textarea
        className="preparaty__cart-note preparaty__mini-rec"
        rows={1}
        placeholder="Напишите общую рекомендацию для пациента..."
        aria-label="Общая рекомендация для пациента"
        value={recommendation}
        onChange={(event) => onRecommendationChange(event.target.value)}
      />
      <div className="preparaty__mini-panel-actions">
        <button type="button" className="preparaty__cart-btn" onClick={onWrite}>
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
        <button type="button" className="preparaty__cart-btn" onClick={onCopy}>
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

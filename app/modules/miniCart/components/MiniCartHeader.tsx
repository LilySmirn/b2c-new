import type { PointerEvent } from "react";

type MiniCartHeaderProps = {
  diagnosis: string;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
  onDragPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  dragging?: boolean;
};

export default function MiniCartHeader({
  diagnosis,
  onMinimize,
  onExpand,
  onClose,
  onDragPointerDown,
  dragging = false,
}: MiniCartHeaderProps) {
  return (
    <div
      className={`preparaty__mini-panel-head${dragging ? " is-dragging" : ""}`}
      onPointerDown={onDragPointerDown}
    >
      <div className="preparaty__mini-panel-brand">
        <span className="preparaty__mini-panel-logo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mini-cart/logo-white.png" width={101} height={43} alt="" />
        </span>
        <h2 className="preparaty__mini-panel-title">{diagnosis}</h2>
      </div>
      <div className="preparaty__win-controls" role="group" aria-label="Управление окном">
        <button
          type="button"
          className="preparaty__win-btn preparaty__win-btn--min"
          title="Свернуть"
          aria-label="Свернуть до логотипа"
          onClick={onMinimize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path fill="currentColor" d="M1 5.25h8v1.1H1z" />
          </svg>
        </button>
        <button
          type="button"
          className="preparaty__win-btn preparaty__win-btn--max"
          title="Развернуть"
          aria-label="Развернуть"
          onClick={onExpand}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              d="M2.2 2.2h5.6v5.6H2.2z"
            />
          </svg>
        </button>
        <button
          type="button"
          className="preparaty__win-btn preparaty__win-btn--close"
          title="Закрыть"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path fill="currentColor" d="M2.1 1.3 L8.7 7.9 L7.9 8.7 L1.3 2.1z" />
            <path fill="currentColor" d="M7.9 1.3 L8.7 2.1 L2.1 8.7 L1.3 7.9z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

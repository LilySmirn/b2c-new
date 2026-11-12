import type { CSSProperties, PointerEvent } from "react";

type MiniCartDockProps = {
  hidden: boolean;
  onRestore: () => void;
  onDragPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
  style?: CSSProperties;
};

export default function MiniCartDock({
  hidden,
  onRestore,
  onDragPointerDown,
  dragging = false,
  style,
}: MiniCartDockProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      className={`preparaty__dock${dragging ? " is-dragging" : ""}`}
      title="Открыть миникорзинку"
      aria-label="Открыть миникорзинку EasyMed"
      style={style}
      onPointerDown={onDragPointerDown}
      onClick={(event) => {
        if (dragging) {
          event.preventDefault();
          return;
        }
        onRestore();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mini-cart/logo-white.png" width={101} height={43} alt="" />
    </button>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

type MiniCartDockProps = {
  hidden: boolean;
  onRestore: () => void;
  onDragPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  dragging?: boolean;
  style?: CSSProperties;
};

type DockPoint = { left: number; top: number };

const DRAG_THRESHOLD_PX = 5;

function clampDockPoint(
  left: number,
  top: number,
  width: number,
  height: number,
): DockPoint {
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  return {
    left: Math.min(maxLeft, Math.max(0, left)),
    top: Math.min(maxTop, Math.max(0, top)),
  };
}

export default function MiniCartDock({
  hidden,
  onRestore,
  onDragPointerDown,
  dragging = false,
  style,
}: MiniCartDockProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const [pos, setPos] = useState<DockPoint | null>(null);
  const [pointerDragging, setPointerDragging] = useState(false);
  const placed = pos !== null;

  useEffect(() => {
    if (!placed) return;
    const onResize = () => {
      const el = buttonRef.current;
      const width = el?.offsetWidth ?? 0;
      const height = el?.offsetHeight ?? 0;
      if (width <= 0 || height <= 0) return;
      setPos((current) => {
        if (!current) return current;
        const next = clampDockPoint(current.left, current.top, width, height);
        if (next.left === current.left && next.top === current.top) return current;
        return next;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [placed]);

  if (hidden) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    onDragPointerDown?.(event);
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer may already be gone */
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    setPointerDragging(true);
    setPos(
      clampDockPoint(
        drag.originLeft + dx,
        drag.originTop + dy,
        drag.width,
        drag.height,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    setPointerDragging(false);
    const el = event.currentTarget;
    try {
      if (el?.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* ignore */
    }
  };

  const dockStyle: CSSProperties | undefined = pos
    ? {
        ...style,
        left: pos.left,
        top: pos.top,
        right: "auto",
        bottom: "auto",
      }
    : style;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`preparaty__dock${
        dragging || pointerDragging ? " is-dragging" : ""
      }`}
      title="Открыть миникорзинку"
      aria-label="Открыть миникорзинку EasyMed"
      style={dockStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={(event) => {
        if (dragging || suppressClickRef.current) {
          suppressClickRef.current = false;
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

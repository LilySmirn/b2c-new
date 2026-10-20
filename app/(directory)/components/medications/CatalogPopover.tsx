"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./CatalogPopover.module.css";

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const placeMenu = (rect: DOMRect, minWidth: number): MenuPosition => {
  const viewportPadding = 8;
  const gap = 4;
  const width = Math.min(360, Math.max(rect.width, minWidth));
  const maxLeft = window.innerWidth - width - viewportPadding;
  const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
  const spaceAbove = rect.top - gap - viewportPadding;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(96, Math.min(280, openUp ? spaceAbove : spaceBelow));

  if (openUp) {
    return {
      bottom: window.innerHeight - rect.top + gap,
      left,
      width,
      maxHeight,
    };
  }

  return {
    top: rect.bottom + gap,
    left,
    width,
    maxHeight,
  };
};

type CatalogPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  minWidth?: number;
  label: string;
};

export function CatalogOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`${styles.option} ${selected ? styles.optionCurrent : ""}`}
      title={typeof children === "string" ? children : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

export default function CatalogPopover({
  open,
  anchorRef,
  onClose,
  children,
  header,
  minWidth = 220,
  label,
}: CatalogPopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = (event?: Event) => {
      if (
        event &&
        menuRef.current &&
        event.target instanceof Node &&
        menuRef.current.contains(event.target)
      ) {
        return;
      }

      const anchor = anchorRef.current;
      if (!anchor) return;

      setPosition(placeMenu(anchor.getBoundingClientRect(), minWidth));
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, minWidth, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      onClose();
    };

    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={styles.menu}
      data-catalog-menu="true"
      style={{
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
    >
      {header}
      <div className={styles.list} role="listbox" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

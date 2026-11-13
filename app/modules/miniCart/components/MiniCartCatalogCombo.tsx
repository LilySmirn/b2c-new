"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import MiniCartPortal from "./MiniCartPortal";

type MiniCartCatalogComboProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

const placeMenu = (
  rect: DOMRect,
  view: Window,
  minWidth: number,
): { top?: number; bottom?: number; left: number; width: number; maxHeight: number } => {
  const viewportPadding = 8;
  const gap = 4;
  const width = Math.min(360, Math.max(rect.width, minWidth));
  const maxLeft = view.innerWidth - width - viewportPadding;
  const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
  const spaceBelow = view.innerHeight - rect.bottom - gap - viewportPadding;
  const spaceAbove = rect.top - gap - viewportPadding;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(96, Math.min(280, openUp ? spaceAbove : spaceBelow));

  if (openUp) {
    return {
      bottom: view.innerHeight - rect.top + gap,
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

/** Combobox дозы/формы с поповером внутри документа мини-корзинки (PiP-safe). */
export default function MiniCartCatalogCombo({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: MiniCartCatalogComboProps) {
  const { ownerDocument } = useMiniCartPortal();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ReturnType<typeof placeMenu> | null>(
    null,
  );
  const hasList = options.length > 0 && !disabled;

  useEffect(() => {
    if (!hasList) setOpen(false);
  }, [hasList]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const view = ownerDocument.defaultView;
    const anchor = anchorRef.current;
    if (!view || !anchor) return;

    const update = () => {
      setPosition(placeMenu(anchor.getBoundingClientRect(), view, 220));
    };

    update();
    view.addEventListener("scroll", update, true);
    view.addEventListener("resize", update);
    return () => {
      view.removeEventListener("scroll", update, true);
      view.removeEventListener("resize", update);
    };
  }, [open, ownerDocument]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };

    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    ownerDocument.addEventListener("keydown", onKeyDown, true);
    ownerDocument.addEventListener("mousedown", onPointerDown);
    return () => {
      ownerDocument.removeEventListener("keydown", onKeyDown, true);
      ownerDocument.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, ownerDocument]);

  return (
    <label className="preparaty__drug-field">
      <span className="preparaty__drug-field-label">{label}</span>
      <div
        ref={anchorRef}
        className={`preparaty__drug-combo${hasList ? " has-list" : ""}`}
      >
        <input
          type="text"
          className="preparaty__drug-control"
          value={value}
          placeholder={label}
          aria-label={label}
          autoComplete="off"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        {hasList ? (
          <button
            type="button"
            className="preparaty__drug-combo-toggle"
            aria-label={`Варианты: ${label}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            ▾
          </button>
        ) : null}
      </div>
      {open && position ? (
        <MiniCartPortal>
          <div
            ref={menuRef}
            className="preparaty__drug-catalog-menu"
            role="listbox"
            aria-label={label}
            style={{
              position: "fixed",
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              zIndex: 1400,
            }}
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={`preparaty__drug-catalog-option${
                  option === value ? " is-selected" : ""
                }`}
                title={option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </MiniCartPortal>
      ) : null}
    </label>
  );
}

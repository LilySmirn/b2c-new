"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import { isLivePortalTarget } from "../pip/documentPip";

/**
 * Портал модалок/поповеров в ownerDocument мини-корзинки (opener или PiP).
 * Не монтирует в уже закрытый PiP document — иначе React ломает opener.
 */
export default function MiniCartPortal({ children }: { children: ReactNode }) {
  const { portalRoot, ownerDocument } = useMiniCartPortal();

  const preferred = portalRoot;
  const fallbackBody =
    ownerDocument && isLivePortalTarget(ownerDocument.body)
      ? ownerDocument.body
      : null;
  const target = isLivePortalTarget(preferred)
    ? preferred
    : isLivePortalTarget(fallbackBody)
      ? fallbackBody
      : null;

  if (!target) return null;
  return createPortal(children, target);
}

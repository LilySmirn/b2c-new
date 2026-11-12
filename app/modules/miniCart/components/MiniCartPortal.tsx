"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";

/**
 * Портал модалок/поповеров в ownerDocument мини-корзинки (opener или PiP).
 */
export default function MiniCartPortal({ children }: { children: ReactNode }) {
  const { portalRoot, ownerDocument } = useMiniCartPortal();
  const target = portalRoot ?? ownerDocument?.body ?? null;
  if (!target) return null;
  return createPortal(children, target);
}

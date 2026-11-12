"use client";

import { createContext, useContext, type ReactNode } from "react";

export type MiniCartPortalContextValue = {
  /** Document, в котором рендерится компактный UI (opener или PiP). */
  ownerDocument: Document;
  /** Корень для createPortal модалок/поповеров. */
  portalRoot: HTMLElement | null;
  /** true, когда UI смонтирован в Document PiP. */
  isPip: boolean;
};

const fallbackDocument =
  typeof document !== "undefined" ? document : (null as unknown as Document);

const MiniCartPortalContext = createContext<MiniCartPortalContextValue>({
  ownerDocument: fallbackDocument,
  portalRoot: null,
  isPip: false,
});

export function MiniCartPortalProvider({
  value,
  children,
}: {
  value: MiniCartPortalContextValue;
  children: ReactNode;
}) {
  return (
    <MiniCartPortalContext.Provider value={value}>
      {children}
    </MiniCartPortalContext.Provider>
  );
}

export function useMiniCartPortal() {
  return useContext(MiniCartPortalContext);
}

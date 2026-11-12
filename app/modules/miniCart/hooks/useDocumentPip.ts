"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  closeDocumentPipWindow,
  copyStylesToPip,
  isPipWindowOpen,
  preparePipDocument,
  requestDocumentPipWindow,
  resolvePipSize,
  supportsDocumentPip,
  type DocumentPipWindow,
} from "../pip/documentPip";

export type UseDocumentPipArgs = {
  /** Вызывать open только из user gesture; enabled означает «хотим PiP». */
  wantPip: boolean;
  /** Измерить размер по fallback-панели в opener. */
  measureEl?: HTMLElement | null;
  onPipClosedByBrowser?: () => void;
  onPipError?: (message: string) => void;
};

export type UseDocumentPipResult = {
  supported: boolean;
  active: boolean;
  portalTarget: HTMLElement | null;
  pipWindow: DocumentPipWindow | null;
  /** Должен вызываться синхронно из click/pointer handler. */
  openFromUserGesture: () => Promise<boolean>;
  close: () => void;
};

/**
 * Управление Document Picture-in-Picture.
 * React-дерево остаётся в opener; UI монтируется через createPortal в pip document.
 */
export function useDocumentPip({
  wantPip,
  measureEl,
  onPipClosedByBrowser,
  onPipError,
}: UseDocumentPipArgs): UseDocumentPipResult {
  const [supported] = useState(() =>
    typeof window !== "undefined" ? supportsDocumentPip() : false,
  );
  const [pipWindow, setPipWindow] = useState<DocumentPipWindow | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const pipRef = useRef<DocumentPipWindow | null>(null);
  const requestRef = useRef<Promise<DocumentPipWindow | null> | null>(null);
  const openingRef = useRef(false);
  const pagehideRef = useRef<((this: Window, ev: PageTransitionEvent) => void) | null>(
    null,
  );
  const onClosedRef = useRef(onPipClosedByBrowser);
  const onErrorRef = useRef(onPipError);
  onClosedRef.current = onPipClosedByBrowser;
  onErrorRef.current = onPipError;

  const teardown = useCallback((notifyBrowserClose: boolean) => {
    const win = pipRef.current;
    if (win && pagehideRef.current) {
      try {
        win.removeEventListener("pagehide", pagehideRef.current);
      } catch {
        /* ignore */
      }
    }
    pagehideRef.current = null;
    pipRef.current = null;
    requestRef.current = null;
    setPipWindow(null);
    setPortalTarget(null);
    closeDocumentPipWindow(win);
    if (notifyBrowserClose) {
      onClosedRef.current?.();
    }
  }, []);

  const close = useCallback(() => {
    teardown(false);
  }, [teardown]);

  const adopt = useCallback((win: DocumentPipWindow) => {
    // Снять прежний pagehide, если переоткрываем.
    if (pipRef.current && pagehideRef.current) {
      try {
        pipRef.current.removeEventListener("pagehide", pagehideRef.current);
      } catch {
        /* ignore */
      }
    }

    copyStylesToPip(document, win);
    const mount = preparePipDocument(win);
    pipRef.current = win;
    setPipWindow(win);
    setPortalTarget(mount);

    const onPageHide = () => {
      teardown(true);
    };
    pagehideRef.current = onPageHide;
    win.addEventListener("pagehide", onPageHide);
    return true;
  }, [teardown]);

  const openFromUserGesture = useCallback(async () => {
    if (!supported) return false;
    if (isPipWindowOpen(pipRef.current) && portalTarget) return true;
    openingRef.current = true;

    if (requestRef.current) {
      const pending = await requestRef.current;
      openingRef.current = false;
      if (pending && adopt(pending)) return true;
      return false;
    }

    const size = resolvePipSize(measureEl ?? undefined);
    const pending = requestDocumentPipWindow(window, size);
    requestRef.current = pending;

    try {
      const win = await pending;
      requestRef.current = null;
      openingRef.current = false;
      if (!win) {
        onErrorRef.current?.("document-pip-request-failed");
        return false;
      }
      return adopt(win);
    } catch (err) {
      requestRef.current = null;
      openingRef.current = false;
      onErrorRef.current?.(String((err as Error)?.message || err || "pip-failed"));
      return false;
    }
  }, [adopt, measureEl, portalTarget, supported]);

  // Закрыть PiP, если режим больше не требует окна.
  useEffect(() => {
    if (!wantPip && !openingRef.current && isPipWindowOpen(pipRef.current)) {
      close();
    }
  }, [wantPip, close]);

  // Cleanup на unmount / навигацию opener.
  useEffect(() => {
    const onOpenerPageHide = () => {
      close();
    };
    window.addEventListener("pagehide", onOpenerPageHide);
    return () => {
      window.removeEventListener("pagehide", onOpenerPageHide);
      close();
    };
  }, [close]);

  return {
    supported,
    active: Boolean(portalTarget && isPipWindowOpen(pipWindow)),
    portalTarget,
    pipWindow,
    openFromUserGesture,
    close,
  };
}

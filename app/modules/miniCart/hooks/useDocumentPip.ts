"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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

export type PipMeasureSource = {
  /** Источник ширины (мини-панель, если есть в DOM). */
  widthEl?: HTMLElement | null;
  /** SideCart (или аналог) для начальной высоты — читать до скрытия full-корзины. */
  heightEl?: HTMLElement | null;
};

export type UseDocumentPipArgs = {
  /** Вызывать open только из user gesture; enabled означает «хотим PiP». */
  wantPip: boolean;
  /**
   * Источники размера на момент открытия (вызывать синхронно из gesture).
   * Getter — чтобы не застревать на stale `ref.current` с прошлого рендера.
   */
  getMeasureSource?: () => PipMeasureSource;
  /** @deprecated Используйте getMeasureSource; оставлен для совместимости. */
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
  getMeasureSource,
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
  const tearingDownRef = useRef(false);
  const cachedHeightRef = useRef<number | null>(null);
  const getMeasureSourceRef = useRef(getMeasureSource);
  getMeasureSourceRef.current = getMeasureSource;
  const onClosedRef = useRef(onPipClosedByBrowser);
  const onErrorRef = useRef(onPipError);
  onClosedRef.current = onPipClosedByBrowser;
  onErrorRef.current = onPipError;

  const clearPipState = useCallback((notifyBrowserClose: boolean) => {
    pagehideRef.current = null;
    pipRef.current = null;
    requestRef.current = null;
    setPipWindow(null);
    setPortalTarget(null);
    if (notifyBrowserClose) {
      onClosedRef.current?.();
    }
  }, []);

  const teardown = useCallback(
    (notifyBrowserClose: boolean) => {
      if (tearingDownRef.current) return;
      tearingDownRef.current = true;

      const win = pipRef.current;
      if (win && pagehideRef.current) {
        try {
          win.removeEventListener("pagehide", pagehideRef.current);
        } catch {
          /* ignore */
        }
      }

      try {
        // Системное закрытие: сбросить порталы/оверлеи, пока PiP document ещё доступен.
        if (notifyBrowserClose) {
          flushSync(() => {
            clearPipState(true);
          });
        } else {
          clearPipState(false);
        }
      } catch {
        clearPipState(notifyBrowserClose);
      } finally {
        closeDocumentPipWindow(win);
        tearingDownRef.current = false;
      }
    },
    [clearPipState],
  );

  const close = useCallback(() => {
    teardown(false);
  }, [teardown]);

  const adopt = useCallback(
    (win: DocumentPipWindow) => {
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
    },
    [teardown],
  );

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

    const source = getMeasureSourceRef.current?.() ?? {};
    const heightEl = source.heightEl ?? null;
    const liveHeight = heightEl?.offsetHeight ?? 0;
    if (liveHeight > 0) {
      cachedHeightRef.current = liveHeight;
    }

    const size = resolvePipSize({
      widthEl: source.widthEl ?? measureEl ?? null,
      heightEl,
      cachedHeight: cachedHeightRef.current,
      opener: window,
    });
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

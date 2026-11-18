export type DocumentPipWindow = Window & {
  document: Document;
  closed: boolean;
  close: () => void;
  addEventListener: Window["addEventListener"];
  removeEventListener: Window["removeEventListener"];
};

export type DocumentPipRequestOptions = {
  width?: number;
  height?: number;
  preferInitialWindowPlacement?: boolean;
  /** Chrome 124+: hide system "back to tab" control. Unknown engines ignore. */
  disallowReturnToOpener?: boolean;
};

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow: (
        options?: DocumentPipRequestOptions,
      ) => Promise<DocumentPipWindow>;
    };
  }
}

export const DEFAULT_PIP_WIDTH = 420;
export const DEFAULT_PIP_HEIGHT = 640;
export const MIN_PIP_WIDTH = 320;
export const MIN_PIP_HEIGHT = 420;
/** Chromium Document PiP top controls (`kTopControlsHeight`). */
export const PIP_TOP_CHROME_HEIGHT = 34;
/** Высота синей шапки `/cart` — запасной safe-top, если SideCart ещё не измерен. */
export const SITE_HEADER_HEIGHT = 85;

export type ResolvePipSizeInput = {
  /** Источник ширины (мини-панель, если уже в DOM). */
  widthEl?: HTMLElement | null;
  /**
   * Источник высоты — правая панель SideCart до сворачивания.
   * Не использовать всю высоту экрана и не подставлять фиксированный px как основной.
   */
  heightEl?: HTMLElement | null;
  /** Последняя измеренная высота SideCart (напр. при restore из дока, когда SideCart hidden). */
  cachedHeight?: number | null;
  opener?: Window;
};

export function supportsDocumentPip(
  win: Window = typeof window !== "undefined" ? window : (undefined as never),
): boolean {
  if (typeof win === "undefined") return false;
  return Boolean(
    win.documentPictureInPicture &&
      typeof win.documentPictureInPicture.requestWindow === "function",
  );
}

export function isPipWindowOpen(
  pipWin: DocumentPipWindow | null | undefined,
): boolean {
  if (!pipWin) return false;
  try {
    return !pipWin.closed;
  } catch {
    return false;
  }
}

/**
 * Можно ли безопасно вызывать createPortal / DOM-операции для target.
 * После системного закрытия PiP document/window уже мёртвы — портал в них ломает React.
 */
export function isLivePortalTarget(
  target: Element | null | undefined,
): target is HTMLElement {
  if (!target || typeof target !== "object") return false;
  // Duck-typing: без instanceof HTMLElement (в node:test DOM API может отсутствовать).
  const node = target as HTMLElement;
  if (typeof node.nodeType !== "number" || node.nodeType !== 1) return false;
  try {
    const doc = node.ownerDocument;
    if (!doc) return false;
    const view = doc.defaultView;
    if (!view || view.closed) return false;
    if (doc.body?.contains(node) || doc.documentElement?.contains(node)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Начальный размер Document PiP.
 * Высота: фактическая высота SideCart (heightEl / cachedHeight), с учётом
 * системного заголовка PiP и без перекрытия шапки сайта.
 * Ширина: без изменений относительно прежней логики (widthEl → fallback).
 */
function isResolvePipSizeInput(
  value: unknown,
): value is ResolvePipSizeInput {
  if (!value || typeof value !== "object") return false;
  return (
    "widthEl" in value ||
    "heightEl" in value ||
    "cachedHeight" in value ||
    "opener" in value
  );
}

export function resolvePipSize(
  panelOrInput?: HTMLElement | null | ResolvePipSizeInput,
): {
  width: number;
  height: number;
} {
  const input: ResolvePipSizeInput = isResolvePipSizeInput(panelOrInput)
    ? panelOrInput
    : panelOrInput
      ? {
          widthEl: panelOrInput as HTMLElement,
          heightEl: panelOrInput as HTMLElement,
        }
      : {};

  const opener =
    input.opener ??
    (typeof window !== "undefined" ? window : (undefined as Window | undefined));

  const width = Math.max(
    MIN_PIP_WIDTH,
    Math.round(input.widthEl?.offsetWidth || DEFAULT_PIP_WIDTH),
  );

  const measuredFromEl = Math.round(input.heightEl?.offsetHeight || 0);
  const measured =
    measuredFromEl > 0
      ? measuredFromEl
      : Math.round(input.cachedHeight || 0) > 0
        ? Math.round(input.cachedHeight || 0)
        : 0;

  let height = Math.max(
    MIN_PIP_HEIGHT,
    measured > 0 ? measured : DEFAULT_PIP_HEIGHT,
  );

  if (opener && typeof opener.innerHeight === "number") {
    const sourceTop = input.heightEl?.getBoundingClientRect?.().top;
    const safeTop =
      typeof sourceTop === "number" && Number.isFinite(sourceTop) && sourceTop > 0
        ? sourceTop
        : SITE_HEADER_HEIGHT;
    // requestWindow height = viewport; Chrome добавляет title bar сверху.
    const maxOuter = Math.max(0, opener.innerHeight - safeTop);
    const maxInner = Math.max(
      MIN_PIP_HEIGHT,
      maxOuter - PIP_TOP_CHROME_HEIGHT,
    );
    height = Math.min(height, maxInner);
  }

  return { width, height };
}

/** Копирует stylesheet/style из opener в PiP-document (как в vanilla-прототипе). */
export function copyStylesToPip(
  openerDoc: Document,
  pipWin: DocumentPipWindow,
): void {
  const head = pipWin.document.head;
  const sheets = openerDoc.querySelectorAll("link[rel='stylesheet'], style");
  sheets.forEach((node) => {
    head.appendChild(node.cloneNode(true));
  });

  try {
    Array.from(openerDoc.styleSheets).forEach((sheet) => {
      if (!sheet.href) return;
      if (head.querySelector(`link[href="${sheet.href}"]`)) return;
      const link = pipWin.document.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      head.appendChild(link);
    });
  } catch {
    /* cross-origin stylesheets may throw */
  }
}

export function preparePipDocument(pipWin: DocumentPipWindow): HTMLElement {
  const { document: pipDoc } = pipWin;
  // PiP creates a separate document; inherit language so auto-translate
  // treats it as Russian (same as the opener root layout).
  pipDoc.documentElement.lang = "ru";
  pipDoc.documentElement.classList.add("preparaty-pip");
  pipDoc.body.className = "preparaty preparaty--pip-host is-collapsed";
  pipDoc.body.style.margin = "0";
  pipDoc.body.style.height = "100%";
  pipDoc.body.style.width = "100%";
  pipDoc.body.style.overflow = "hidden";
  pipDoc.body.style.background = "#fff";

  let mount = pipDoc.getElementById("em-mini-cart-pip-root");
  if (!mount) {
    mount = pipDoc.createElement("div");
    mount.id = "em-mini-cart-pip-root";
    mount.className = "emMiniCart emMiniCart--pip";
    mount.style.width = "100%";
    mount.style.height = "100%";
    mount.style.position = "relative";
    pipDoc.body.appendChild(mount);
  } else {
    mount.classList.add("emMiniCart", "emMiniCart--pip");
    mount.style.position = "relative";
  }

  return mount;
}

export async function requestDocumentPipWindow(
  opener: Window,
  size: { width: number; height: number },
): Promise<DocumentPipWindow | null> {
  if (!supportsDocumentPip(opener)) return null;

  const options: DocumentPipRequestOptions = {
    width: size.width,
    height: size.height,
  };
  try {
    options.preferInitialWindowPlacement = true;
  } catch {
    /* older engines */
  }
  try {
    // Hide system "back to tab"; close (X) remains. Ignored if unsupported.
    options.disallowReturnToOpener = true;
  } catch {
    /* older engines */
  }

  try {
    return await opener.documentPictureInPicture!.requestWindow(options);
  } catch {
    return null;
  }
}

export function closeDocumentPipWindow(
  pipWin: DocumentPipWindow | null | undefined,
): void {
  if (!pipWin) return;
  try {
    if (!pipWin.closed) pipWin.close();
  } catch {
    /* ignore */
  }
}

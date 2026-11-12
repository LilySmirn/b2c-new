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

export function resolvePipSize(panel?: HTMLElement | null): {
  width: number;
  height: number;
} {
  const width = Math.max(
    MIN_PIP_WIDTH,
    Math.round(panel?.offsetWidth || DEFAULT_PIP_WIDTH),
  );
  const height = Math.max(
    MIN_PIP_HEIGHT,
    Math.round(panel?.offsetHeight || DEFAULT_PIP_HEIGHT),
  );
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
    pipDoc.body.appendChild(mount);
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

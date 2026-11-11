/**
 * Уведомления об изменениях корзины:
 * - in-memory подписчики (одно React-приложение, включая будущий Document PiP);
 * - BroadcastChannel (вкладки / окна same-origin);
 * - storage event по meta-ключу (fallback, если канал недоступен).
 *
 * Ревизия растёт только при реальной записи данных. Циклы отсекаются по revision.
 */

import {
  CART_SYNC_META_STORAGE_KEY,
  type CartDataStorageKey,
} from "./cartStorageKeys";

export type CartSyncScope =
  | "recommendation"
  | "selections"
  | "customItems"
  | "generalComments"
  | "cleared";

export type CartSyncMeta = {
  revision: number;
  writerId: string;
  updatedAt: number;
  scopes: CartSyncScope[];
};

export type CartSyncOrigin = "local" | "remote";

export type CartSyncMessage = CartSyncMeta & {
  type: "cart-sync";
  /** local = publish в этой вкладке; remote = BroadcastChannel / storage другой вкладки */
  origin: CartSyncOrigin;
};

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type CartSyncWireMessage = {
  type: "cart-sync";
  revision: number;
  writerId: string;
  updatedAt: number;
  scopes: CartSyncScope[];
};

type BroadcastLike = {
  postMessage: (message: CartSyncWireMessage) => void;
  close?: () => void;
  onmessage: ((event: { data: unknown }) => void) | null;
};

export const CART_SYNC_CHANNEL_NAME = "easymed-directory-cart";

const isScope = (value: unknown): value is CartSyncScope =>
  value === "recommendation" ||
  value === "selections" ||
  value === "customItems" ||
  value === "generalComments" ||
  value === "cleared";

export const parseCartSyncMeta = (raw: string | null): CartSyncMeta | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const row = parsed as Record<string, unknown>;
    if (typeof row.revision !== "number" || !Number.isFinite(row.revision) || row.revision < 0) {
      return null;
    }
    if (typeof row.writerId !== "string" || !row.writerId) return null;
    if (typeof row.updatedAt !== "number" || !Number.isFinite(row.updatedAt)) return null;
    if (!Array.isArray(row.scopes) || !row.scopes.every(isScope)) return null;

    return {
      revision: row.revision,
      writerId: row.writerId,
      updatedAt: row.updatedAt,
      scopes: row.scopes as CartSyncScope[],
    };
  } catch {
    return null;
  }
};

export const parseCartSyncMessage = (value: unknown): CartSyncMessage | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  if (row.type !== "cart-sync") return null;
  if (typeof row.revision !== "number" || !Number.isFinite(row.revision) || row.revision < 0) {
    return null;
  }
  if (typeof row.writerId !== "string" || !row.writerId) return null;
  if (typeof row.updatedAt !== "number" || !Number.isFinite(row.updatedAt)) return null;
  if (!Array.isArray(row.scopes) || !row.scopes.every(isScope)) return null;

  return {
    type: "cart-sync",
    revision: row.revision,
    writerId: row.writerId,
    updatedAt: row.updatedAt,
    scopes: row.scopes as CartSyncScope[],
    origin: "remote",
  };
};

const createWriterId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cart-writer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type CartSyncOptions = {
  getSessionStorage: () => StorageLike | null;
  getLocalStorage: () => StorageLike | null;
  createBroadcastChannel?: (name: string) => BroadcastLike | null;
  addWindowListener?: (
    type: "storage",
    listener: (event: StorageEvent) => void,
  ) => () => void;
  now?: () => number;
  writerId?: string;
};

const browserSessionStorage = (): StorageLike | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const browserLocalStorage = (): StorageLike | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const browserBroadcast = (name: string): BroadcastLike | null => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  try {
    const channel = new BroadcastChannel(name);
    return channel as unknown as BroadcastLike;
  } catch {
    return null;
  }
};

const browserStorageListener = (
  type: "storage",
  listener: (event: StorageEvent) => void,
) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
};

export const createCartSync = (options: CartSyncOptions) => {
  const writerId = options.writerId ?? createWriterId();
  const now = options.now ?? (() => Date.now());
  const listeners = new Set<(message: CartSyncMessage) => void>();
  let lastAppliedRevision = 0;
  let channel: BroadcastLike | null = null;
  let removeStorageListener: (() => void) | null = null;
  let started = false;

  const readMetaFrom = (storage: StorageLike | null) =>
    parseCartSyncMeta(storage?.getItem(CART_SYNC_META_STORAGE_KEY) ?? null);

  const readHighestKnownRevision = () => {
    const sessionMeta = readMetaFrom(options.getSessionStorage());
    const localMeta = readMetaFrom(options.getLocalStorage());
    return Math.max(
      lastAppliedRevision,
      sessionMeta?.revision ?? 0,
      localMeta?.revision ?? 0,
    );
  };

  const notify = (message: CartSyncMessage) => {
    listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error("[cart-sync] listener failed", error);
      }
    });
  };

  const applyMessage = (message: CartSyncMessage, source: CartSyncOrigin) => {
    if (message.revision <= lastAppliedRevision) return false;

    lastAppliedRevision = message.revision;

    if (source === "remote") {
      // sessionStorage вкладки мог отстать от shared localStorage.
      mirrorLocalCartKeysIntoSession(options.getSessionStorage(), options.getLocalStorage());
    }

    notify({ ...message, origin: source });
    return true;
  };

  const ensureStarted = () => {
    if (started) return;

    const hasInjectedIo =
      typeof options.createBroadcastChannel === "function" ||
      typeof options.addWindowListener === "function";

    // SSR без window: не стартуем. В тестах достаточно injected IO.
    if (typeof window === "undefined" && !hasInjectedIo) return;

    started = true;

    lastAppliedRevision = readHighestKnownRevision();

    const createChannel = options.createBroadcastChannel ?? browserBroadcast;
    channel = createChannel(CART_SYNC_CHANNEL_NAME);
    if (channel) {
      channel.onmessage = (event) => {
        const message = parseCartSyncMessage(event.data);
        if (!message) return;
        if (message.writerId === writerId) return;
        applyMessage(message, "remote");
      };
    }

    const addListener = options.addWindowListener ?? browserStorageListener;
    removeStorageListener = addListener("storage", (event) => {
      if (
        event.key !== null &&
        event.key !== CART_SYNC_META_STORAGE_KEY &&
        !isCartDataKey(event.key)
      ) {
        return;
      }

      // storage event приходит только из другого документа — фильтр writerId не нужен
      // и вреден, если событие по data-ключу пришло до обновления meta.
      const metaFromEvent =
        event.key === CART_SYNC_META_STORAGE_KEY
          ? parseCartSyncMeta(event.newValue)
          : null;
      const localMeta = metaFromEvent ?? readMetaFrom(options.getLocalStorage());

      if (!localMeta) {
        if (event.key === CART_SYNC_META_STORAGE_KEY && event.newValue === null) {
          const cleared: CartSyncMessage = {
            type: "cart-sync",
            revision: lastAppliedRevision + 1,
            writerId: "storage-event",
            updatedAt: now(),
            scopes: ["cleared"],
            origin: "remote",
          };
          applyMessage(cleared, "remote");
        }
        return;
      }

      applyMessage({ type: "cart-sync", origin: "remote", ...localMeta }, "remote");
    });
  };

  const writeMeta = (meta: CartSyncMeta) => {
    const serialized = JSON.stringify(meta);
    const storages = [options.getSessionStorage(), options.getLocalStorage()];

    storages.forEach((storage) => {
      if (!storage) return;
      try {
        storage.setItem(CART_SYNC_META_STORAGE_KEY, serialized);
      } catch {
        // Ревизия желательна, но не должна ломать запись корзины.
      }
    });
  };

  return {
    writerId,

    start() {
      ensureStarted();
    },

    subscribe(listener: (message: CartSyncMessage) => void) {
      ensureStarted();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /**
     * Вызывается после успешной записи данных корзины.
     * Уведомляет подписчиков этой вкладки и другие контексты same-origin.
     */
    publish(scopes: readonly CartSyncScope[]) {
      if (!scopes.length) return null;

      ensureStarted();

      const revision = readHighestKnownRevision() + 1;
      const meta: CartSyncMeta = {
        revision,
        writerId,
        updatedAt: now(),
        scopes: [...scopes],
      };

      writeMeta(meta);

      const message: CartSyncMessage = { type: "cart-sync", origin: "local", ...meta };
      lastAppliedRevision = revision;
      notify(message);

      try {
        // origin не уходит в другие вкладки — парсер всегда ставит remote.
        channel?.postMessage({
          type: "cart-sync",
          revision: message.revision,
          writerId: message.writerId,
          updatedAt: message.updatedAt,
          scopes: message.scopes,
        });
      } catch {
        // BroadcastChannel может быть закрыт — storage event останется запасным путём.
      }

      return message;
    },

    readMeta(): CartSyncMeta | null {
      ensureStarted();
      const localMeta = readMetaFrom(options.getLocalStorage());
      const sessionMeta = readMetaFrom(options.getSessionStorage());

      if (localMeta && sessionMeta) {
        return localMeta.revision >= sessionMeta.revision ? localMeta : sessionMeta;
      }

      return localMeta ?? sessionMeta;
    },

    getLastAppliedRevision() {
      return lastAppliedRevision;
    },

    /** Для тестов: применить сообщение как будто оно пришло снаружи. */
    applyRemoteForTests(message: CartSyncMessage) {
      return applyMessage(message, "remote");
    },

    dispose() {
      listeners.clear();
      removeStorageListener?.();
      removeStorageListener = null;
      try {
        channel?.close?.();
      } catch {
        // ignore
      }
      channel = null;
      started = false;
    },
  };
};

const isCartDataKey = (key: string): key is CartDataStorageKey =>
  key === "directoryCartRecommendation" ||
  key === "directoryCartSelections" ||
  key === "directoryCartCustomItems" ||
  key === "directoryCartGeneralComments";

export const mirrorLocalCartKeysIntoSession = (
  sessionStorage: StorageLike | null,
  localStorage: StorageLike | null,
) => {
  if (!sessionStorage || !localStorage) return;

  const keys = [
    "directoryCartRecommendation",
    "directoryCartSelections",
    "directoryCartCustomItems",
    "directoryCartGeneralComments",
    CART_SYNC_META_STORAGE_KEY,
  ] as const;

  keys.forEach((key) => {
    try {
      const value = localStorage.getItem(key);
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Зеркалирование не должно ронять UI.
    }
  });
};

/**
 * Сверяет sessionStorage с localStorage по ревизии.
 * Если shared localStorage новее — копирует его в sessionStorage вкладки,
 * чтобы не восстановить устаревшее состояние после reload.
 */
export const reconcileCartStorages = (
  sessionStorage: StorageLike | null,
  localStorage: StorageLike | null,
) => {
  if (!sessionStorage && !localStorage) return "empty" as const;
  if (!sessionStorage) return "local-only" as const;
  if (!localStorage) return "session-only" as const;

  const sessionMeta = parseCartSyncMeta(
    sessionStorage.getItem(CART_SYNC_META_STORAGE_KEY),
  );
  const localMeta = parseCartSyncMeta(
    localStorage.getItem(CART_SYNC_META_STORAGE_KEY),
  );

  if (localMeta && (!sessionMeta || localMeta.revision > sessionMeta.revision)) {
    mirrorLocalCartKeysIntoSession(sessionStorage, localStorage);
    return "prefer-local" as const;
  }

  if (sessionMeta && (!localMeta || sessionMeta.revision > localMeta.revision)) {
    // session новее (сбой записи в local) — восстановим shared-копию.
    [
      "directoryCartRecommendation",
      "directoryCartSelections",
      "directoryCartCustomItems",
      "directoryCartGeneralComments",
      CART_SYNC_META_STORAGE_KEY,
    ].forEach((key) => {
      try {
        const value = sessionStorage.getItem(key);
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    });
    return "prefer-session" as const;
  }

  return "in-sync" as const;
};

const CART_SYNC_GLOBAL_KEY = "__easymedDirectoryCartSync__";

type CartSyncGlobal = typeof globalThis & {
  [CART_SYNC_GLOBAL_KEY]?: ReturnType<typeof createCartSync>;
};

let browserCartSync: ReturnType<typeof createCartSync> | null = null;

export const getCartSync = () => {
  const globalStore = globalThis as CartSyncGlobal;
  if (globalStore[CART_SYNC_GLOBAL_KEY]) {
    browserCartSync = globalStore[CART_SYNC_GLOBAL_KEY]!;
    return browserCartSync;
  }

  if (!browserCartSync) {
    browserCartSync = createCartSync({
      getSessionStorage: browserSessionStorage,
      getLocalStorage: browserLocalStorage,
    });
  }

  if (typeof globalThis !== "undefined") {
    globalStore[CART_SYNC_GLOBAL_KEY] = browserCartSync;
  }

  return browserCartSync;
};

export const subscribeCartSync = (
  listener: (message: CartSyncMessage) => void,
) => getCartSync().subscribe(listener);

export const publishCartSync = (scopes: readonly CartSyncScope[]) =>
  getCartSync().publish(scopes);

/** Сброс синглтона — только для тестов. */
export const resetCartSyncForTests = () => {
  browserCartSync?.dispose();
  browserCartSync = null;
  const globalStore = globalThis as CartSyncGlobal;
  delete globalStore[CART_SYNC_GLOBAL_KEY];
};

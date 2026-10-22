"use client";

import { parseMedsCatalogResponse, resolveMeds } from "./medsClient";
import type { MedsCatalogResponse } from "./medsCatalogTypes";
import { readMedsSource, type MedsSource } from "./medsSource";

export const MEDS_CATALOG_STORAGE_KEY = "directoryCartMedsCatalog";

/**
 * Версия ключа справочника. v2 отделяет ответ API от прежнего гибридного кэша,
 * где часть `other` подменялась тестовыми комбинациями.
 */
export const MEDS_CATALOG_STORAGE_VERSION = "v2";

/**
 * Кэш real и mock не делят один ключ.
 * Ключи без версии и ключ `:combination-mock` не читаются.
 */
export const medsCatalogStorageKey = (source: MedsSource = readMedsSource()) =>
  `${MEDS_CATALOG_STORAGE_KEY}:${MEDS_CATALOG_STORAGE_VERSION}:${source}`;

/** Прежние ключи справочника. Их содержимое больше не используется. */
export const LEGACY_MEDS_CATALOG_STORAGE_KEYS = [
  MEDS_CATALOG_STORAGE_KEY,
  `${MEDS_CATALOG_STORAGE_KEY}:real`,
  `${MEDS_CATALOG_STORAGE_KEY}:mock`,
  `${MEDS_CATALOG_STORAGE_KEY}:real:combination-mock`,
  `${MEDS_CATALOG_STORAGE_KEY}:mock:combination-mock`,
] as const;

export type MedsCatalogSessionStatus = "loading" | "ready" | "error";

export type MedsCatalogSessionEntry = {
  recommendationKey: string;
  names: readonly string[];
  ids: readonly string[];
  status: MedsCatalogSessionStatus;
  catalog: MedsCatalogResponse | null;
};

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type MedsResolve = (names: readonly string[]) => Promise<MedsCatalogResponse>;

type StoredMedsCatalog = {
  source: MedsSource;
  recommendationKey: string;
  names: string[];
  ids: string[];
  status: MedsCatalogSessionStatus;
  catalog: MedsCatalogResponse | null;
};

export type MedsCatalogLoadResult = {
  status: "ready" | "error" | "stale";
};

type MemoryEntry = MedsCatalogSessionEntry & {
  requestId: number;
};

const sameSequence = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const browserStorages = (): StorageLike[] => {
  if (typeof window === "undefined") return [];

  return [window.sessionStorage, window.localStorage];
};

const dropLegacyCatalogCache = (stores: readonly StorageLike[]) => {
  stores.forEach((storage) => {
    LEGACY_MEDS_CATALOG_STORAGE_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch {
        // Устаревший справочник не должен мешать открытию корзины.
      }
    });
  });
};

export const createMedsCatalogSession = ({
  storages,
  resolve = resolveMeds,
  source = readMedsSource(),
}: {
  storages: () => readonly StorageLike[];
  resolve?: MedsResolve;
  source?: MedsSource;
}) => {
  const storageKey = medsCatalogStorageKey(source);
  dropLegacyCatalogCache(storages());
  const memory = new Map<string, MemoryEntry>();
  const listeners = new Set<() => void>();
  const pending = new Map<
    number,
    {
      promise: Promise<MedsCatalogLoadResult>;
      resolve: (result: MedsCatalogLoadResult) => void;
    }
  >();
  let latestRequestId = 0;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const persist = (entry: StoredMedsCatalog) => {
    const serialized = JSON.stringify({ ...entry, source });

    storages().forEach((storage) => {
      try {
        storage.setItem(storageKey, serialized);
      } catch {
        // Сессия в памяти остаётся до перезагрузки страницы.
      }
    });
  };

  const readPersisted = (): StoredMedsCatalog | null => {
    for (const storage of storages()) {
      const raw = storage.getItem(storageKey);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;

        const row = parsed as Record<string, unknown>;
        if (row.source !== source) continue;
        if (row.combinationMock === true) continue;
        if (typeof row.recommendationKey !== "string" || !row.recommendationKey) continue;
        if (!isStringArray(row.names) || !isStringArray(row.ids)) continue;
        if (row.names.length !== row.ids.length) continue;
        if (row.status !== "loading" && row.status !== "ready" && row.status !== "error") continue;

        if (row.status === "ready") {
          const catalog = parseMedsCatalogResponse(row.catalog);
          if (!catalog || catalog.drugs.length !== row.names.length) continue;

          return {
            source,
            recommendationKey: row.recommendationKey,
            names: row.names,
            ids: row.ids,
            status: "ready",
            catalog,
          };
        }

        return {
          source,
          recommendationKey: row.recommendationKey,
          names: row.names,
          ids: row.ids,
          status: row.status,
          catalog: null,
        };
      } catch {
        continue;
      }
    }

    return null;
  };

  const remember = (entry: MemoryEntry, stored: StoredMedsCatalog) => {
    memory.set(entry.recommendationKey, entry);
    if (entry.requestId === latestRequestId) persist(stored);
    notify();
  };

  const settle = (requestId: number, result: MedsCatalogLoadResult) => {
    const request = pending.get(requestId);
    if (!request) return;

    pending.delete(requestId);
    request.resolve(result);
  };

  const abandonEarlier = (requestId: number) => {
    for (const id of [...pending.keys()]) {
      if (id < requestId) settle(id, { status: "stale" });
    }
  };

  const sameQuery = (
    entry: { names: readonly string[]; ids: readonly string[] },
    names: readonly string[],
    ids: readonly string[],
  ) => sameSequence(entry.names, names) && sameSequence(entry.ids, ids);

  const adoptReady = (
    recommendationKey: string,
    names: readonly string[],
    ids: readonly string[],
    catalog: MedsCatalogResponse,
  ): MedsCatalogLoadResult => {
    const requestId = ++latestRequestId;
    abandonEarlier(requestId);
    const namesCopy = [...names];
    const idsCopy = [...ids];

    memory.set(recommendationKey, {
      recommendationKey,
      names: namesCopy,
      ids: idsCopy,
      status: "ready",
      catalog,
      requestId,
    });
    persist({
      source,
      recommendationKey,
      names: namesCopy,
      ids: idsCopy,
      status: "ready",
      catalog,
    });
    notify();

    return { status: "ready" };
  };

  const begin = (
    recommendationKey: string,
    names: readonly string[],
    ids: readonly string[],
  ): Promise<MedsCatalogLoadResult> => {
    if (!recommendationKey) return Promise.resolve({ status: "stale" });

    const requestId = ++latestRequestId;
    abandonEarlier(requestId);
    const namesCopy = [...names];
    const idsCopy = [...ids];
    const loading: MemoryEntry = {
      recommendationKey,
      names: namesCopy,
      ids: idsCopy,
      status: "loading",
      catalog: null,
      requestId,
    };
    let resolveResult: (result: MedsCatalogLoadResult) => void = () => {};
    const promise = new Promise<MedsCatalogLoadResult>((resolveLoad) => {
      resolveResult = resolveLoad;
    });
    pending.set(requestId, { promise, resolve: resolveResult });

    remember(loading, {
      source,
      recommendationKey,
      names: namesCopy,
      ids: idsCopy,
      status: "loading",
      catalog: null,
    });

    resolve(namesCopy).then(
      (catalog) => {
        if (requestId !== latestRequestId) {
          settle(requestId, { status: "stale" });
          return;
        }
        if (catalog.drugs.length !== namesCopy.length) {
          console.error("[meds] catalog response length does not match the request");
          remember(
            { ...loading, status: "error", catalog: null },
            {
              source,
              recommendationKey,
              names: namesCopy,
              ids: idsCopy,
              status: "error",
              catalog: null,
            },
          );
          settle(requestId, { status: "error" });
          return;
        }

        remember(
          { ...loading, status: "ready", catalog },
          {
            source,
            recommendationKey,
            names: namesCopy,
            ids: idsCopy,
            status: "ready",
            catalog,
          },
        );
        settle(requestId, { status: "ready" });
      },
      (error: unknown) => {
        if (requestId !== latestRequestId) {
          settle(requestId, { status: "stale" });
          return;
        }

        console.error(
          "[meds] catalog request failed",
          error instanceof Error ? error.message : "unknown error",
        );
        remember(
          { ...loading, status: "error", catalog: null },
          {
            source,
            recommendationKey,
            names: namesCopy,
            ids: idsCopy,
            status: "error",
            catalog: null,
          },
        );
        settle(requestId, { status: "error" });
      },
    );

    return promise;
  };

  const hasReady = (
    recommendationKey: string,
    names: readonly string[],
    ids: readonly string[],
  ) => {
    if (!recommendationKey) return false;

    const current = memory.get(recommendationKey);
    if (
      current?.status === "ready" &&
      current.catalog &&
      current.catalog.drugs.length === names.length &&
      sameQuery(current, names, ids)
    ) {
      return true;
    }

    const stored = readPersisted();
    return Boolean(
      stored?.status === "ready" &&
        stored.catalog &&
        stored.recommendationKey === recommendationKey &&
        sameQuery(stored, names, ids),
    );
  };

  const load = (
    recommendationKey: string,
    names: readonly string[],
    ids: readonly string[],
  ): Promise<MedsCatalogLoadResult> => {
    if (!recommendationKey) return Promise.resolve({ status: "stale" });

    const current = memory.get(recommendationKey);
    if (current && current.requestId === latestRequestId && sameQuery(current, names, ids)) {
      if (current.status === "ready" && current.catalog) {
        return Promise.resolve({ status: "ready" });
      }

      if (current.status === "loading") {
        const request = pending.get(current.requestId);
        if (request) return request.promise;
      }
    }

    if (
      current?.status === "ready" &&
      current.catalog &&
      current.catalog.drugs.length === names.length &&
      sameQuery(current, names, ids)
    ) {
      return Promise.resolve(adoptReady(recommendationKey, names, ids, current.catalog));
    }

    const stored = readPersisted();
    if (
      stored?.status === "ready" &&
      stored.catalog &&
      stored.recommendationKey === recommendationKey &&
      sameQuery(stored, names, ids)
    ) {
      return Promise.resolve(adoptReady(recommendationKey, stored.names, stored.ids, stored.catalog));
    }

    return begin(recommendationKey, names, ids);
  };

  return {
    begin,

    ensure(
      recommendationKey: string,
      names: readonly string[],
      ids: readonly string[],
    ) {
      void load(recommendationKey, names, ids);
    },

    hasReady,

    load,

    read(recommendationKey: string): MedsCatalogSessionEntry | null {
      if (!recommendationKey) return null;

      const entry = memory.get(recommendationKey);
      if (!entry) return null;

      return {
        recommendationKey: entry.recommendationKey,
        names: entry.names,
        ids: entry.ids,
        status: entry.status,
        catalog: entry.catalog,
      };
    },

    clear() {
      latestRequestId += 1;
      for (const id of [...pending.keys()]) settle(id, { status: "stale" });
      memory.clear();
      const keys = new Set<string>([storageKey, ...LEGACY_MEDS_CATALOG_STORAGE_KEYS]);
      storages().forEach((storage) => {
        keys.forEach((key) => {
          try {
            storage.removeItem(key);
          } catch {
            // Очистка корзины не должна падать из-за хранилища.
          }
        });
      });
      notify();
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const medsCatalogSession = createMedsCatalogSession({
  storages: browserStorages,
  source: readMedsSource(),
});

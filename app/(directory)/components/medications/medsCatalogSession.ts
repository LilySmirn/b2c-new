"use client";

import { parseMedsCatalogResponse, resolveMeds } from "./medsClient";
import type { MedsCatalogResponse } from "./medsCatalogTypes";

export const MEDS_CATALOG_STORAGE_KEY = "directoryCartMedsCatalog";

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
  recommendationKey: string;
  names: string[];
  ids: string[];
  status: MedsCatalogSessionStatus;
  catalog: MedsCatalogResponse | null;
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

export const createMedsCatalogSession = ({
  storages,
  resolve = resolveMeds,
}: {
  storages: () => readonly StorageLike[];
  resolve?: MedsResolve;
}) => {
  const memory = new Map<string, MemoryEntry>();
  const listeners = new Set<() => void>();
  let latestRequestId = 0;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const persist = (entry: StoredMedsCatalog) => {
    const serialized = JSON.stringify(entry);

    storages().forEach((storage) => {
      try {
        storage.setItem(MEDS_CATALOG_STORAGE_KEY, serialized);
      } catch {
        // Сессия в памяти остаётся до перезагрузки страницы.
      }
    });
  };

  const readPersisted = (): StoredMedsCatalog | null => {
    for (const storage of storages()) {
      const raw = storage.getItem(MEDS_CATALOG_STORAGE_KEY);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;

        const row = parsed as Record<string, unknown>;
        if (typeof row.recommendationKey !== "string" || !row.recommendationKey) continue;
        if (!isStringArray(row.names) || !isStringArray(row.ids)) continue;
        if (row.names.length !== row.ids.length) continue;
        if (row.status !== "loading" && row.status !== "ready" && row.status !== "error") continue;

        if (row.status === "ready") {
          const catalog = parseMedsCatalogResponse(row.catalog);
          if (!catalog || catalog.drugs.length !== row.names.length) continue;

          return {
            recommendationKey: row.recommendationKey,
            names: row.names,
            ids: row.ids,
            status: "ready",
            catalog,
          };
        }

        return {
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

  const begin = (
    recommendationKey: string,
    names: readonly string[],
    ids: readonly string[],
  ) => {
    if (!recommendationKey) return;

    const requestId = ++latestRequestId;
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

    remember(loading, {
      recommendationKey,
      names: namesCopy,
      ids: idsCopy,
      status: "loading",
      catalog: null,
    });

    resolve(namesCopy).then(
      (catalog) => {
        if (requestId !== latestRequestId) return;
        if (catalog.drugs.length !== namesCopy.length) {
          remember(
            { ...loading, status: "error", catalog: null },
            {
              recommendationKey,
              names: namesCopy,
              ids: idsCopy,
              status: "error",
              catalog: null,
            },
          );
          return;
        }

        remember(
          { ...loading, status: "ready", catalog },
          {
            recommendationKey,
            names: namesCopy,
            ids: idsCopy,
            status: "ready",
            catalog,
          },
        );
      },
      () => {
        if (requestId !== latestRequestId) return;

        remember(
          { ...loading, status: "error", catalog: null },
          {
            recommendationKey,
            names: namesCopy,
            ids: idsCopy,
            status: "error",
            catalog: null,
          },
        );
      },
    );
  };

  return {
    begin,

    ensure(
      recommendationKey: string,
      names: readonly string[],
      ids: readonly string[],
    ) {
      if (!recommendationKey) return;

      const current = memory.get(recommendationKey);
      if (
        current &&
        current.requestId === latestRequestId &&
        sameSequence(current.names, names) &&
        sameSequence(current.ids, ids) &&
        (current.status === "loading" || current.status === "ready")
      ) {
        return;
      }

      const stored = readPersisted();
      if (
        stored &&
        stored.status === "ready" &&
        stored.catalog &&
        stored.recommendationKey === recommendationKey &&
        sameSequence(stored.names, names) &&
        sameSequence(stored.ids, ids)
      ) {
        const requestId = ++latestRequestId;
        memory.set(recommendationKey, {
          recommendationKey,
          names: stored.names,
          ids: stored.ids,
          status: "ready",
          catalog: stored.catalog,
          requestId,
        });
        notify();
        return;
      }

      begin(recommendationKey, names, ids);
    },

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
      memory.clear();
      storages().forEach((storage) => {
        try {
          storage.removeItem(MEDS_CATALOG_STORAGE_KEY);
        } catch {
          // Очистка корзины не должна падать из-за хранилища.
        }
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
});

import {
  cloneCombinationDraft,
  type CombinationDraft,
  type CombinationPick,
} from "./combinationSelection";
import type { MedsCatalogItemRecord } from "./medsCatalogTypes";

export const COMBINATION_SELECTION_STORAGE_KEY = "directoryCartCombinationSelections";

export type CombinationStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ITEM_FIELDS = [
  "standard_MNN",
  "SMNN_code",
  "standard_form",
  "standard_dose",
  "name_trade",
  "code_ATC",
  "name_unit",
] as const;

const readItem = (value: unknown): MedsCatalogItemRecord | null => {
  if (!isRecord(value)) return null;

  const item = {} as MedsCatalogItemRecord;

  for (const field of ITEM_FIELDS) {
    if (typeof value[field] !== "string") return null;
    item[field] = value[field];
  }

  return item;
};

const readPick = (value: unknown): CombinationPick | null => {
  if (!isRecord(value)) return null;
  if (typeof value.inn !== "string" || typeof value.confirmed !== "boolean") return null;
  if (value.item !== null && !readItem(value.item)) return null;

  return {
    inn: value.inn,
    confirmed: value.confirmed,
    item: value.item === null ? null : readItem(value.item),
  };
};

const readDraft = (value: unknown): CombinationDraft | null => {
  if (!isRecord(value) || !Array.isArray(value.picks) || value.picks.length === 0) return null;

  const picks = value.picks.map(readPick);
  if (picks.some((pick) => pick === null)) return null;

  return { picks: picks as CombinationPick[] };
};

export const parseCombinationSelectionMap = (
  raw: string,
): Record<string, Record<string, CombinationDraft>> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;

    const map: Record<string, Record<string, CombinationDraft>> = {};

    Object.entries(parsed).forEach(([recommendationKey, rows]) => {
      if (!recommendationKey || !isRecord(rows)) return;

      const bucket: Record<string, CombinationDraft> = {};

      Object.entries(rows).forEach(([itemId, draft]) => {
        const readable = readDraft(draft);
        if (!itemId || !readable) return;
        bucket[itemId] = readable;
      });

      if (Object.keys(bucket).length > 0) map[recommendationKey] = bucket;
    });

    return map;
  } catch {
    return null;
  }
};

export const readCombinationSelectionMap = (storages: readonly CombinationStorage[]) => {
  for (const storage of storages) {
    const raw = storage.getItem(COMBINATION_SELECTION_STORAGE_KEY);
    if (raw === null) continue;

    const parsed = parseCombinationSelectionMap(raw);
    if (parsed) return parsed;
  }

  return {};
};

export const writeCombinationSelection = (
  storages: readonly CombinationStorage[],
  recommendationKey: string,
  itemId: string,
  draft: CombinationDraft,
) => {
  if (!recommendationKey || !itemId) return;

  const current = readCombinationSelectionMap(storages);
  const next = {
    ...current,
    [recommendationKey]: {
      ...(current[recommendationKey] ?? {}),
      [itemId]: cloneCombinationDraft(draft),
    },
  };
  const serialized = JSON.stringify(next);

  storages.forEach((storage) => {
    try {
      storage.setItem(COMBINATION_SELECTION_STORAGE_KEY, serialized);
    } catch {
      // Запись выбора не должна ломать подтверждение схемы.
    }
  });
};

const browserStorages = (): CombinationStorage[] => {
  if (typeof window === "undefined") return [];

  return [window.sessionStorage, window.localStorage];
};

export const readBrowserCombinationSelections = (recommendationKey: string) => {
  if (!recommendationKey) return {};

  return readCombinationSelectionMap(browserStorages())[recommendationKey] ?? {};
};

export const persistBrowserCombinationSelection = (
  recommendationKey: string,
  itemId: string,
  draft: CombinationDraft,
) => {
  writeCombinationSelection(browserStorages(), recommendationKey, itemId, draft);
};

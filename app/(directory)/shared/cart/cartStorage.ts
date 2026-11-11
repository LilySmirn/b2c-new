/**
 * Общее чтение / запись / очистка состояния корзины.
 * Ключи и JSON-форматы совпадают с прежней реализацией в cart/SideCart/mkb/header.
 */

import type { SelectedPrescription } from "@/app/(directory)/components/PrescriptionChecklist";
import { medsCatalogSession } from "@/app/(directory)/components/medications/medsCatalogSession";
import {
  CART_CUSTOM_ITEMS_STORAGE_KEY,
  CART_DATA_STORAGE_KEYS,
  CART_GENERAL_COMMENT_STORAGE_KEY,
  CART_RECOMMENDATION_STORAGE_KEY,
  CART_SELECTIONS_STORAGE_KEY,
  CART_SYNC_META_STORAGE_KEY,
} from "./cartStorageKeys";
import {
  getCartSync,
  publishCartSync,
  reconcileCartStorages,
  type CartSyncScope,
  type StorageLike,
} from "./cartSync";

export type StoredCartRecommendation = {
  diagnosisTitle?: string;
  recommendationKey?: string;
  recommendation?: {
    id?: string;
    title?: string;
    mkbCodes?: string[];
    source?: string;
    prescriptions?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type StoredCartSelections = Record<string, SelectedPrescription[]>;

export type StoredCustomCartItem = {
  id: string;
  name: string;
  comment: string;
};

export type StoredCustomCartItems = Record<string, StoredCustomCartItem[]>;
export type StoredGeneralComments = Record<string, string>;

type CartStorageOptions = {
  getSessionStorage: () => StorageLike | null;
  getLocalStorage: () => StorageLike | null;
  publish?: (scopes: readonly CartSyncScope[]) => unknown;
  clearMedsCatalog?: () => void;
  reconcile?: boolean;
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

const safeGet = (storage: StorageLike | null, key: string) => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: StorageLike | null, key: string, value: string) => {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeRemove = (storage: StorageLike | null, key: string) => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

const dualWrite = (
  sessionStorage: StorageLike | null,
  localStorage: StorageLike | null,
  key: string,
  value: string,
) => {
  const previousSession = safeGet(sessionStorage, key);
  const previousLocal = safeGet(localStorage, key);
  if (previousSession === value && previousLocal === value) {
    return false;
  }

  safeSet(sessionStorage, key, value);
  safeSet(localStorage, key, value);
  return true;
};

const dualRemove = (
  sessionStorage: StorageLike | null,
  localStorage: StorageLike | null,
  key: string,
) => {
  const hadSession = safeGet(sessionStorage, key) !== null;
  const hadLocal = safeGet(localStorage, key) !== null;
  if (!hadSession && !hadLocal) return false;

  safeRemove(sessionStorage, key);
  safeRemove(localStorage, key);
  return true;
};

const parseObjectMap = <T>(raw: string | null): Record<string, T> => {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {};
  } catch {
    return {};
  }
};

export const getRecommendationStorageKey = (data: StoredCartRecommendation) => {
  if (typeof data.recommendationKey === "string" && data.recommendationKey) {
    return data.recommendationKey;
  }

  const recommendation = data.recommendation;

  return [
    data.diagnosisTitle,
    recommendation?.id,
    recommendation?.title,
    Array.isArray(recommendation?.mkbCodes)
      ? recommendation.mkbCodes.join(",")
      : undefined,
  ]
    .filter(Boolean)
    .join("|");
};

export const normalizeStoredSelectionItems = (
  storedSelection: unknown,
): SelectedPrescription[] => {
  if (!Array.isArray(storedSelection)) return [];

  return storedSelection
    .map((item) => {
      if (typeof item === "string") {
        return { id: item, comment: "" } as SelectedPrescription;
      }

      if (item && typeof item === "object" && "id" in item) {
        return {
          ...(item as SelectedPrescription),
          id: String((item as { id: unknown }).id),
          comment:
            typeof (item as { comment?: unknown }).comment === "string"
              ? (item as { comment: string }).comment
              : "",
        };
      }

      return null;
    })
    .filter((item): item is SelectedPrescription => Boolean(item?.id));
};

export const createCartStorage = (options: CartStorageOptions) => {
  const publish = options.publish ?? publishCartSync;
  const clearMedsCatalog =
    options.clearMedsCatalog ?? (() => medsCatalogSession.clear());

  const storages = () => ({
    session: options.getSessionStorage(),
    local: options.getLocalStorage(),
  });

  const ensureReconciled = () => {
    if (options.reconcile === false) return;
    const { session, local } = storages();
    reconcileCartStorages(session, local);
  };

  const readRawPreferred = (key: string) => {
    ensureReconciled();
    const { session, local } = storages();
    return safeGet(session, key) ?? safeGet(local, key);
  };

  return {
    readRecommendationRaw() {
      return readRawPreferred(CART_RECOMMENDATION_STORAGE_KEY);
    },

    readRecommendation(): StoredCartRecommendation | null {
      const raw = readRawPreferred(CART_RECOMMENDATION_STORAGE_KEY);
      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as StoredCartRecommendation)
          : null;
      } catch {
        return null;
      }
    },

    writeRecommendation(
      diagnosisTitle: string,
      recommendation: StoredCartRecommendation["recommendation"] & object,
      recommendationKey: string,
    ) {
      const payload: StoredCartRecommendation = {
        diagnosisTitle,
        recommendationKey,
        recommendation,
      };
      const serialized = JSON.stringify(payload);
      const { session, local } = storages();
      const changed = dualWrite(
        session,
        local,
        CART_RECOMMENDATION_STORAGE_KEY,
        serialized,
      );
      if (changed) publish(["recommendation"]);
      return recommendationKey;
    },

    writeRecommendationSerialized(serialized: string) {
      const { session, local } = storages();
      const changed = dualWrite(
        session,
        local,
        CART_RECOMMENDATION_STORAGE_KEY,
        serialized,
      );
      if (changed) publish(["recommendation"]);
      return changed;
    },

    readSelectionsMap(): StoredCartSelections {
      const raw = readRawPreferred(CART_SELECTIONS_STORAGE_KEY);
      const parsed = parseObjectMap<unknown>(raw);
      const result: StoredCartSelections = {};

      Object.entries(parsed).forEach(([key, value]) => {
        const items = normalizeStoredSelectionItems(value);
        if (items.length > 0) result[key] = items;
      });

      return result;
    },

    readSelectionsForKey(recommendationKey: string): SelectedPrescription[] {
      if (!recommendationKey) return [];
      return this.readSelectionsMap()[recommendationKey] ?? [];
    },

    writeSelections(
      recommendationKey: string,
      selectedItems: SelectedPrescription[],
    ) {
      if (!recommendationKey) return false;

      const storedSelections = this.readSelectionsMap();

      if (selectedItems.length > 0) {
        storedSelections[recommendationKey] = selectedItems;
      } else {
        delete storedSelections[recommendationKey];
      }

      const serialized = JSON.stringify(storedSelections);
      const { session, local } = storages();
      const previous =
        safeGet(session, CART_SELECTIONS_STORAGE_KEY) ??
        safeGet(local, CART_SELECTIONS_STORAGE_KEY);

      // Пустой объект `{}` после удаления всех ключей — допустимое состояние.
      if (previous === serialized) return false;

      const changed = dualWrite(
        session,
        local,
        CART_SELECTIONS_STORAGE_KEY,
        serialized,
      );
      if (changed) publish(["selections"]);
      return changed;
    },

    readCustomItemsMap(): StoredCustomCartItems {
      const raw = readRawPreferred(CART_CUSTOM_ITEMS_STORAGE_KEY);
      const parsed = parseObjectMap<unknown>(raw);
      const result: StoredCustomCartItems = {};

      Object.entries(parsed).forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
        const items = value.filter(
          (item): item is StoredCustomCartItem =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof (item as StoredCustomCartItem).id === "string" &&
                typeof (item as StoredCustomCartItem).name === "string",
            ),
        );
        if (items.length > 0) result[key] = items;
      });

      return result;
    },

    readCustomItems(recommendationKey: string): StoredCustomCartItem[] {
      if (!recommendationKey) return [];
      return this.readCustomItemsMap()[recommendationKey] ?? [];
    },

    writeCustomItems(
      recommendationKey: string,
      customItems: StoredCustomCartItem[],
    ) {
      if (!recommendationKey) return false;

      const stored = this.readCustomItemsMap();

      if (customItems.length > 0) {
        stored[recommendationKey] = customItems;
      } else {
        delete stored[recommendationKey];
      }

      const serialized = JSON.stringify(stored);
      const { session, local } = storages();
      const previous =
        safeGet(session, CART_CUSTOM_ITEMS_STORAGE_KEY) ??
        safeGet(local, CART_CUSTOM_ITEMS_STORAGE_KEY);
      if (previous === serialized) return false;

      const changed = dualWrite(
        session,
        local,
        CART_CUSTOM_ITEMS_STORAGE_KEY,
        serialized,
      );
      if (changed) publish(["customItems"]);
      return changed;
    },

    readGeneralCommentsMap(): StoredGeneralComments {
      return parseObjectMap<string>(
        readRawPreferred(CART_GENERAL_COMMENT_STORAGE_KEY),
      );
    },

    readGeneralComment(recommendationKey: string): string {
      if (!recommendationKey) return "";
      const stored = this.readGeneralCommentsMap()[recommendationKey];
      return typeof stored === "string" ? stored : "";
    },

    writeGeneralComment(recommendationKey: string, comment: string) {
      if (!recommendationKey) return false;

      const stored = this.readGeneralCommentsMap();
      const normalizedComment = comment.trim();

      if (normalizedComment) {
        stored[recommendationKey] = comment;
      } else {
        delete stored[recommendationKey];
      }

      const serialized = JSON.stringify(stored);
      const { session, local } = storages();
      const previous =
        safeGet(session, CART_GENERAL_COMMENT_STORAGE_KEY) ??
        safeGet(local, CART_GENERAL_COMMENT_STORAGE_KEY);
      if (previous === serialized) return false;

      const changed = dualWrite(
        session,
        local,
        CART_GENERAL_COMMENT_STORAGE_KEY,
        serialized,
      );
      if (changed) publish(["generalComments"]);
      return changed;
    },

    /**
     * Очистка как в DirectoryPageHeader: recommendation/selections/custom/comments
     * + кеш препаратов. Комбинации и шаблоны не трогаем (прежнее поведение).
     */
    clearCartState() {
      const { session, local } = storages();
      let changed = false;

      CART_DATA_STORAGE_KEYS.forEach((key) => {
        if (dualRemove(session, local, key)) changed = true;
      });

      if (dualRemove(session, local, CART_SYNC_META_STORAGE_KEY)) {
        changed = true;
      }

      clearMedsCatalog();

      if (changed) publish(["cleared"]);
      return changed;
    },
  };
};

export const cartStorage = createCartStorage({
  getSessionStorage: browserSessionStorage,
  getLocalStorage: browserLocalStorage,
  publish: (scopes) => {
    getCartSync().start();
    return publishCartSync(scopes);
  },
});

export const getStoredCartRecommendation = () =>
  cartStorage.readRecommendationRaw();

export const readStoredSelections = () => cartStorage.readSelectionsMap();

export const writeStoredSelections = (
  recommendationKey: string,
  selectedItems: SelectedPrescription[],
) => cartStorage.writeSelections(recommendationKey, selectedItems);

export const clearDirectoryCartState = () => cartStorage.clearCartState();

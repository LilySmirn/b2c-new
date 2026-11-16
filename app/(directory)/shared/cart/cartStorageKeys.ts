/** Существующие ключи состояния корзины. Форматы значений не меняются. */

export const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";
export const CART_SELECTIONS_STORAGE_KEY = "directoryCartSelections";
export const CART_CUSTOM_ITEMS_STORAGE_KEY = "directoryCartCustomItems";
export const CART_GENERAL_COMMENT_STORAGE_KEY = "directoryCartGeneralComments";
/** Пользовательские параметры назначений (dose/form/scheme/course/inn/trade/intake/commentSources). */
export const CART_ASSIGNMENTS_STORAGE_KEY = "directoryCartAssignments";

/**
 * Служебный ключ ревизии для сверки sessionStorage и localStorage.
 * Не содержит пользовательских данных корзины.
 */
export const CART_SYNC_META_STORAGE_KEY = "directoryCartSyncMeta";

export const CART_DATA_STORAGE_KEYS = [
  CART_RECOMMENDATION_STORAGE_KEY,
  CART_SELECTIONS_STORAGE_KEY,
  CART_CUSTOM_ITEMS_STORAGE_KEY,
  CART_GENERAL_COMMENT_STORAGE_KEY,
  CART_ASSIGNMENTS_STORAGE_KEY,
] as const;

export type CartDataStorageKey = (typeof CART_DATA_STORAGE_KEYS)[number];

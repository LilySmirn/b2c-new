import type { MiniCartNav } from "./types";

/**
 * Временные feature flags верхних вкладок мини-корзинки.
 * Вкладки и панели не удаляются — достаточно поставить `true`, чтобы вернуть вкладку.
 */
export const MINI_CART_NAV_FLAGS: Record<MiniCartNav, boolean> = {
  "clinical-recs": true,
  /** Временно скрыто: EasyMed AI */
  "easymed-ai": false,
  /** Временно скрыто: лекарственные взаимодействия */
  interactions: false,
};

export const DEFAULT_MINI_CART_NAV: MiniCartNav = "clinical-recs";

export function isMiniCartNavEnabled(nav: MiniCartNav): boolean {
  return MINI_CART_NAV_FLAGS[nav] !== false;
}

export function resolveMiniCartNav(nav: MiniCartNav): MiniCartNav {
  return isMiniCartNavEnabled(nav) ? nav : DEFAULT_MINI_CART_NAV;
}

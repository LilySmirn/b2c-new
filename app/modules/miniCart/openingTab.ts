import type { MiniCartTab } from "./types";

/** Резерв: первая доступная вкладка КР, иначе «Препараты». */
export const resolveMiniCartOpeningTabId = (
  tabs: readonly MiniCartTab[],
  preferredTabId?: string | null,
): string => {
  if (
    preferredTabId &&
    tabs.some((tab) => tab.id === preferredTabId && tab.enabled !== false)
  ) {
    return preferredTabId;
  }

  return (
    tabs.find((tab) => tab.active && tab.enabled !== false)?.id ??
    tabs.find((tab) => tab.enabled !== false)?.id ??
    "drugs"
  );
};

/** Страница горизонтальной навигации, где видна вкладка (по 4 на страницу). */
export const miniCartTabPageForId = (
  tabs: readonly MiniCartTab[],
  tabId: string,
): 0 | 1 => (tabs.findIndex((tab) => tab.id === tabId) >= 4 ? 1 : 0);

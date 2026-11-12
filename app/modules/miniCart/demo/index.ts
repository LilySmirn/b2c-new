/**
 * Изолированные демо-данные K26 только для preview мини-корзинки.
 * Не использовать в production-пути синхронизации корзины.
 */

import type {
  MiniCartCatalog,
  MiniCartCatalogItem,
  MiniCartShellTab,
  MiniCartTradesBook,
} from "../types";
import catalogJson from "./k26Catalog.json";
import shellTabsJson from "./shellTabs.json";
import tradesJson from "./trades.json";
import interactionsJson from "./interactions.json";

export const MINI_CART_DEMO_CATALOG = catalogJson as MiniCartCatalog;
export const MINI_CART_DEMO_SHELL_TABS = shellTabsJson as Record<
  string,
  MiniCartShellTab
>;
export const MINI_CART_DEMO_TRADES = tradesJson as MiniCartTradesBook;
export const MINI_CART_DEMO_INTERACTIONS = interactionsJson as Record<
  string,
  unknown
>;

export const flattenShellClassicItems = (
  shellTabs: Record<string, MiniCartShellTab>,
): MiniCartCatalogItem[] => {
  const list: MiniCartCatalogItem[] = [];

  Object.entries(shellTabs).forEach(([tabId, shell]) => {
    (shell.groups ?? []).forEach((group) => {
      (group.items ?? []).forEach((row, index) => {
        if (!row?.name) return;
        list.push({
          id: row.id || `${tabId}-${index}-${row.name}`,
          kind: "classic",
          name: row.name,
          qc: row.qc || "",
          level: row.level || "",
          hint: row.hint || "",
          commentText: row.comment || "",
          selected: Boolean(row.selected),
          tabId,
          group: group.id || group.title || "",
        });
      });
    });
  });

  return list;
};

export const createDemoDrugItems = (): MiniCartCatalogItem[] =>
  MINI_CART_DEMO_CATALOG.items.map((item) => ({
    ...item,
    selected: false,
    commentShort: "",
    selectedInn: item.inn || "",
    selectedTrade: "",
    selectedDose: "",
    selectedForm: "",
  }));

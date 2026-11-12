import type { MiniCartCatalogItem } from "../types";

export const displayName = (item: MiniCartCatalogItem) => {
  if (item.selectedTrade) return item.selectedTrade;
  if (item.selectedInn) {
    return item.selectedInn
      .toLowerCase()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return item.name || "";
};

export const displaySub = (item: MiniCartCatalogItem) => {
  if (item.kind === "alternatives" && !item.selectedTrade) {
    return "Выберите МНН / торговое наименование";
  }
  if (item.kind === "trade" && !item.selectedTrade) {
    return "Выберите торговое наименование";
  }
  if (item.selectedTrade && item.selectedInn) {
    return item.selectedInn;
  }
  return "";
};

export const isSelectableDrug = (item: MiniCartCatalogItem) =>
  item.kind === "alternatives" ||
  item.kind === "trade" ||
  item.kind === "scheme" ||
  item.kind === "combo" ||
  item.kind === "extra-drug";

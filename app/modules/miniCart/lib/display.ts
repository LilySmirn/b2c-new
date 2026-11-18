import { resolveMedicationDisplayTitle } from "@/app/(directory)/components/medications/assignmentScheme";
import type { MiniCartCatalogItem } from "../types";

/** То же правило, что у SideCart: торговое → МНН → исходное название КР. */
export const displayName = (item: MiniCartCatalogItem) =>
  resolveMedicationDisplayTitle(item.name || "", {
    trade: item.selectedTrade,
    inn: item.selectedInn,
  });

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

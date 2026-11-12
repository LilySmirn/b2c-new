/**
 * View-model адаптер: production ChecklistSection + medsCatalog → MiniCart props.
 * Не содержит бизнес-логики препаратов / API — только отображение.
 */

import {
  defaultChecklistCategories,
  mergeChecklistSectionsByTitle,
  shouldShowSectionTitle,
  sortSectionsForDisplay,
  type AppendixA3Table,
  type ChecklistItem,
  type ChecklistSection,
} from "@/app/(directory)/components/checklistModel";
import {
  assignmentFromDraft,
  hasCustomAssignment,
  tableScheduleValue,
} from "@/app/(directory)/components/medications/assignmentScheme";
import {
  EMPTY_ASSIGNMENT_SNAPSHOT,
  type ChecklistAssignmentSnapshot,
} from "@/app/(directory)/components/medications/assignmentSnapshot";
import {
  combinationSelectionSummary,
  sanitizeCombinationDraft,
  type CombinationDraft,
} from "@/app/(directory)/components/medications/combinationSelection";
import { matchMedsDrugForItem } from "@/app/(directory)/components/medications/medsClient";
import type {
  MedsCatalogComponent,
  MedsCatalogDrug,
  MedsCatalogEntry,
  MedsCatalogInnGroup,
  MedsCatalogItemRecord,
  MedsCatalogResponse,
} from "@/app/(directory)/components/medications/medsCatalogTypes";
import type { StoredCustomCartItem } from "@/app/(directory)/shared/cart";
import type {
  MiniCartAlternative,
  MiniCartCatalogItem,
  MiniCartComponent,
  MiniCartComponentPick,
  MiniCartItemKind,
  MiniCartSchemeSource,
  MiniCartShellTab,
  MiniCartTab,
  MiniCartTradeEntry,
  MiniCartTradesBook,
} from "../types";

/** Вкладки мини-корзинки: «Препараты» всегда `drugs` (см. MiniCartItemList). */
export const MINI_CART_DRUGS_TAB_ID = "drugs";
export const MINI_CART_CUSTOM_TAB_ID = "lifestyle";
export const MINI_CART_CUSTOM_GROUP_ID = "custom-misc";
export const MINI_CART_CUSTOM_GROUP_TITLE = "Прочее";

const CATEGORY_TO_TAB_ID: Record<string, string> = {
  medications: MINI_CART_DRUGS_TAB_ID,
};

export const categoryIdToMiniCartTabId = (categoryId: string) =>
  CATEGORY_TO_TAB_ID[categoryId] ?? categoryId;

export const miniCartTabIdToCategoryId = (tabId: string) => {
  if (tabId === MINI_CART_DRUGS_TAB_ID) return "medications";
  return tabId;
};

export type DirectoryMiniCartSource = {
  diagnosisTitle: string;
  sections: ChecklistSection[];
  catalog: MedsCatalogResponse;
  catalogQuery: { ids: readonly string[]; names: readonly string[] } | null;
  appendixA3Tables?: AppendixA3Table[];
  isAppendixA3Loading?: boolean;
  appendixA3Error?: string;
  assignment?: ChecklistAssignmentSnapshot;
  customItems?: StoredCustomCartItem[];
  generalRecommendation?: string;
};

export type DirectoryMiniCartViewModel = {
  diagnosis: string;
  tabs: MiniCartTab[];
  drugItems: MiniCartCatalogItem[];
  shellTabs: Record<string, MiniCartShellTab>;
  trades: MiniCartTradesBook;
  recommendation: string;
  /** Production-компоненты схем для компактного мастера (индексы = picks). */
  schemeByItemId: Record<string, MiniCartSchemeSource>;
};

/** Стабильный view-id компонента схемы; production хранит picks по индексу. */
export const miniCartComponentId = (itemId: string, index: number) =>
  `${itemId}__comp__${index}`;

export const parseMiniCartComponentIndex = (
  itemId: string,
  componentId: string,
): number | null => {
  const prefix = `${itemId}__comp__`;
  if (!componentId.startsWith(prefix)) return null;
  const raw = componentId.slice(prefix.length);
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
};


const sameInnKey = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

const buildHint = (item: ChecklistItem) => {
  const parts = [item.info?.trim(), item.infoComment?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join("\n\n");
};

const alternativesFromGroups = (
  groups: readonly MedsCatalogInnGroup[],
): MiniCartAlternative[] =>
  groups.map((group) => ({
    inn: group.name,
    label: group.name,
  }));

const componentKind = (
  component: MedsCatalogComponent,
): MiniCartComponent["kind"] => {
  if (component.type === "group") return "alternatives";
  if (component.type === "drug") return "trade";
  return "plain";
};

const mapCombinationComponent = (
  itemId: string,
  component: MedsCatalogComponent,
  index: number,
): MiniCartComponent => {
  const id = miniCartComponentId(itemId, index);
  const kind = componentKind(component);

  if (component.type === "group") {
    return {
      id,
      kind,
      label: component.name,
      alternatives: alternativesFromGroups(component.data),
    };
  }

  if (component.type === "drug") {
    const inn = component.data[0]?.name ?? component.name;
    return {
      id,
      kind,
      label: component.name,
      inn,
      alternatives: alternativesFromGroups(component.data),
    };
  }

  return {
    id,
    kind,
    label: component.name,
  };
};

const resolveItemKind = (entry: MedsCatalogDrug | null): MiniCartItemKind => {
  if (!entry || entry.type === "other") return "plain";
  if (entry.type === "combination") return "scheme";
  if (entry.type === "group") return "alternatives";
  if (entry.type === "drug") {
    const hasTrades = entry.data.some((group) =>
      group.items.some((row) => row.name_trade.trim()),
    );
    return hasTrades ? "trade" : "plain";
  }
  return "plain";
};

const primaryInn = (entry: MedsCatalogDrug | null): string | undefined => {
  if (!entry || entry.type === "other" || entry.type === "combination") {
    return undefined;
  }
  if (entry.type === "drug") return entry.data[0]?.name || undefined;
  return undefined;
};

const mapCombinationPicks = (
  itemId: string,
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | undefined,
): Record<string, MiniCartComponentPick> | undefined => {
  if (!draft?.picks.length) return undefined;

  const picks: Record<string, MiniCartComponentPick> = {};
  components.forEach((_component, index) => {
    const pick = draft.picks[index];
    if (!pick) return;
    picks[miniCartComponentId(itemId, index)] = {
      inn: pick.inn,
      trade: pick.item?.name_trade ?? "",
      dose: pick.item?.standard_dose ?? "",
      form: pick.item?.standard_form ?? "",
    };
  });

  return Object.keys(picks).length > 0 ? picks : undefined;
};

const resolveItemState = (
  item: ChecklistItem,
  assignment: ChecklistAssignmentSnapshot,
) => {
  const byId = assignment.itemStates[item.id];
  if (byId) return byId;

  for (const sourceId of item.sourceIds ?? []) {
    const state = assignment.itemStates[sourceId];
    if (state) return state;
  }

  return { checked: item.checked, comment: item.comment };
};

const mapDrugItem = (
  item: ChecklistItem,
  entry: MedsCatalogDrug | null,
  assignment: ChecklistAssignmentSnapshot,
): MiniCartCatalogItem => {
  const kind = resolveItemKind(entry);
  const components =
    entry?.type === "combination"
      ? entry.combination_data.map((component, index) =>
          mapCombinationComponent(item.id, component, index),
        )
      : undefined;
  const alternatives =
    entry?.type === "group" ? alternativesFromGroups(entry.data) : undefined;
  const draft = assignment.medicationDrafts[item.id];
  const intake = assignment.medicationIntake[item.id];
  const fields = assignmentFromDraft(draft, intake);
  const custom = hasCustomAssignment(fields);
  const displayScheme = tableScheduleValue(
    fields.schemeText,
    item.treatmentPlan ?? "",
    custom,
  );
  const displayCourse = tableScheduleValue(
    fields.courseText,
    item.treatmentDuration ?? "",
    custom,
  );
  const combinationDraft = assignment.combinations[item.id];
  const componentPicks =
    entry?.type === "combination"
      ? mapCombinationPicks(item.id, entry.combination_data, combinationDraft)
      : undefined;
  const schemeSummary =
    entry?.type === "combination"
      ? combinationSelectionSummary(entry.combination_data, combinationDraft)
      : "";
  const itemState = resolveItemState(item, assignment);

  return {
    id: item.id,
    kind,
    name: item.title,
    inn: primaryInn(entry),
    qc: item.qualityControl ? "КК" : "",
    level: item.code || "",
    hint: buildHint(item),
    scheme: displayScheme,
    schemeShort: "",
    course: displayCourse,
    courseShort: "",
    composition:
      entry?.type === "combination"
        ? entry.combination_data.map((component) => component.name)
        : undefined,
    alternatives,
    components,
    componentPicks,
    selected: itemState.checked,
    selectedInn: draft?.inn ?? "",
    selectedTrade:
      schemeSummary || draft?.trade || "",
    selectedDose: fields.dose,
    selectedForm: fields.form,
    commentShort: itemState.comment || "",
    commentText: itemState.comment || "",
    tabId: MINI_CART_DRUGS_TAB_ID,
  };
};

const collectTradeEntries = (
  groups: readonly MedsCatalogInnGroup[],
): MiniCartTradeEntry[] => {
  const byTrade = new Map<string, MiniCartTradeEntry>();

  groups.forEach((group) => {
    group.items.forEach((row: MedsCatalogItemRecord) => {
      const trade = row.name_trade.trim();
      if (!trade) return;

      const key = sameInnKey(trade);
      const existing = byTrade.get(key);
      const variant = {
        dose: row.standard_dose || undefined,
        form: row.standard_form || undefined,
      };

      if (!existing) {
        byTrade.set(key, {
          trade,
          variants: variant.dose || variant.form ? [variant] : [],
        });
        return;
      }

      if (!variant.dose && !variant.form) return;
      const variants = existing.variants ?? [];
      const duplicate = variants.some(
        (item) =>
          sameInnKey(item.dose ?? "") === sameInnKey(variant.dose ?? "") &&
          sameInnKey(item.form ?? "") === sameInnKey(variant.form ?? ""),
      );
      if (!duplicate) {
        variants.push(variant);
        existing.variants = variants;
      }
    });
  });

  return Array.from(byTrade.values());
};

const appendTradesForEntry = (
  book: MiniCartTradesBook,
  entry: MedsCatalogEntry,
) => {
  if (entry.type === "other") return;

  if (entry.type === "combination") {
    entry.combination_data.forEach((component) => {
      if (component.type === "other") return;
      component.data.forEach((group) => {
        const key = group.name.trim();
        if (!key) return;
        const trades = collectTradeEntries([group]);
        if (!trades.length) return;
        const current = book[key]?.trades ?? [];
        const merged = new Map(
          [...current, ...trades].map((row) => [sameInnKey(row.trade), row]),
        );
        book[key] = { trades: Array.from(merged.values()) };
      });
    });
    return;
  }

  if (entry.type === "group") {
    entry.data.forEach((group) => {
      const key = group.name.trim();
      if (!key) return;
      book[key] = { trades: collectTradeEntries([group]) };
    });
    return;
  }

  // drug
  entry.data.forEach((group) => {
    const key = group.name.trim();
    if (!key) return;
    const trades = collectTradeEntries([group]);
    if (!trades.length) return;
    book[key] = { trades };
  });
};

const buildTradesBook = (catalog: MedsCatalogResponse): MiniCartTradesBook => {
  const book: MiniCartTradesBook = {};
  catalog.drugs.forEach((entry) => appendTradesForEntry(book, entry));
  return book;
};

const appendCustomItemsGroup = (
  shellTabs: Record<string, MiniCartShellTab>,
  customItems: readonly StoredCustomCartItem[],
) => {
  if (customItems.length === 0) return;

  const tabId = MINI_CART_CUSTOM_TAB_ID;
  const existing = shellTabs[tabId] ?? { enabled: true, groups: [] };
  const groups = [...(existing.groups ?? [])];
  groups.push({
    id: MINI_CART_CUSTOM_GROUP_ID,
    title: MINI_CART_CUSTOM_GROUP_TITLE,
    items: customItems.map((item) => ({
      id: item.id,
      name: item.name,
      qc: "",
      level: "",
      hint: "",
      comment: item.comment || "",
      selected: true,
    })),
  });

  shellTabs[tabId] = {
    ...existing,
    enabled: true,
    groups,
  };
};

const buildClassicShellTabs = (
  sections: ChecklistSection[],
  appendixA3Tables: AppendixA3Table[],
  isAppendixA3Loading: boolean,
  appendixA3Error: string,
  assignment: ChecklistAssignmentSnapshot,
  customItems: readonly StoredCustomCartItem[],
): Record<string, MiniCartShellTab> => {
  const shellTabs: Record<string, MiniCartShellTab> = {};
  const byCategory = new Map<string, ChecklistSection[]>();

  sections.forEach((section) => {
    if (section.categoryId === "medications") return;
    const list = byCategory.get(section.categoryId) ?? [];
    list.push(section);
    byCategory.set(section.categoryId, list);
  });

  byCategory.forEach((categorySections, categoryId) => {
    const tabId = categoryIdToMiniCartTabId(categoryId);
    const groups = categorySections.map((section) => ({
      id: section.id,
      title: shouldShowSectionTitle(section) ? section.title : "",
      items: section.items.map((item) => {
        const itemState = resolveItemState(item, assignment);
        return {
          id: item.id,
          name: item.title,
          qc: item.qualityControl ? "КК" : "",
          level: item.code || "",
          hint: buildHint(item),
          comment: itemState.comment || "",
          selected: itemState.checked,
        };
      }),
    }));

    shellTabs[tabId] = {
      enabled: groups.some((group) => (group.items?.length ?? 0) > 0),
      selectAllLabel:
        categoryId === "required-diagnostics"
          ? "Выбрать всю обязательную диагностику"
          : undefined,
      groups,
    };
  });

  const appendixTabId = categoryIdToMiniCartTabId("appendix-a3");
  if (isAppendixA3Loading) {
    shellTabs[appendixTabId] = {
      enabled: true,
      note: "Загружаем таблицы приложения А3...",
      groups: [],
    };
  } else if (appendixA3Error) {
    shellTabs[appendixTabId] = {
      enabled: true,
      note: appendixA3Error,
      groups: [],
    };
  } else if (appendixA3Tables.length > 0) {
    shellTabs[appendixTabId] = {
      enabled: true,
      groups: [
        {
          id: "appendix-a3-tables",
          title: "Таблицы",
          items: appendixA3Tables.map((table, index) => ({
            id: `appendix-a3-${index}`,
            name: table.name?.trim() || `Таблица ${index + 1}`,
            qc: "",
            level: "",
            hint: table.comment?.trim() || "",
            comment: table.comment?.trim() || "",
          })),
        },
      ],
    };
  } else {
    shellTabs[appendixTabId] = {
      enabled: false,
      note: "Для выбранной клинической рекомендации таблицы приложения А3 не найдены.",
      groups: [],
    };
  }

  appendCustomItemsGroup(shellTabs, customItems);

  return shellTabs;
};

const buildTabs = (
  sections: ChecklistSection[],
  shellTabs: Record<string, MiniCartShellTab>,
  hasMedications: boolean,
): MiniCartTab[] => {
  const available = new Set(
    sections.map((section) => categoryIdToMiniCartTabId(section.categoryId)),
  );
  if (shellTabs[categoryIdToMiniCartTabId("appendix-a3")]?.enabled) {
    available.add(categoryIdToMiniCartTabId("appendix-a3"));
  }
  if (shellTabs[MINI_CART_CUSTOM_TAB_ID]?.enabled) {
    available.add(MINI_CART_CUSTOM_TAB_ID);
  }

  const preferredActive = hasMedications
    ? MINI_CART_DRUGS_TAB_ID
    : defaultChecklistCategories.map((category) =>
        categoryIdToMiniCartTabId(category.id),
      ).find((tabId) => {
        if (tabId === MINI_CART_DRUGS_TAB_ID) return hasMedications;
        return shellTabs[tabId]?.enabled;
      }) ?? defaultChecklistCategories[0].id;

  return defaultChecklistCategories.map((category) => {
    const tabId = categoryIdToMiniCartTabId(category.id);
    const enabled =
      tabId === MINI_CART_DRUGS_TAB_ID
        ? hasMedications
        : Boolean(shellTabs[tabId]?.enabled) || available.has(tabId);

    return {
      id: tabId,
      label: category.label,
      active: tabId === preferredActive,
      enabled,
    };
  });
};

/**
 * Готовит props мини-корзинки из уже загруженных данных полноразмерной корзины.
 * Не выполняет API-запросов.
 */
export const adaptDirectoryCartToMiniCart = (
  source: DirectoryMiniCartSource,
): DirectoryMiniCartViewModel => {
  const assignment = source.assignment ?? EMPTY_ASSIGNMENT_SNAPSHOT;
  const customItems = source.customItems ?? [];
  const merged = sortSectionsForDisplay(
    mergeChecklistSectionsByTitle(source.sections),
  );
  const medicationSections = merged.filter(
    (section) => section.categoryId === "medications",
  );
  const schemeByItemId: Record<string, MiniCartSchemeSource> = {};
  const drugItems = medicationSections.flatMap((section) =>
    section.items.map((item) => {
      const entry = matchMedsDrugForItem(
        source.catalog,
        source.catalogQuery,
        item,
      );
      if (entry?.type === "combination") {
        schemeByItemId[item.id] = {
          components: entry.combination_data,
          confirmed: sanitizeCombinationDraft(
            entry.combination_data,
            assignment.combinations[item.id],
          ),
        };
      }
      return mapDrugItem(item, entry, assignment);
    }),
  );

  const shellTabs = buildClassicShellTabs(
    merged,
    source.appendixA3Tables ?? [],
    Boolean(source.isAppendixA3Loading),
    source.appendixA3Error ?? "",
    assignment,
    customItems,
  );

  const tabs = buildTabs(merged, shellTabs, drugItems.length > 0);

  return {
    diagnosis: source.diagnosisTitle.trim() || "Назначения",
    tabs,
    drugItems,
    shellTabs,
    trades: buildTradesBook(source.catalog),
    recommendation: source.generalRecommendation ?? "",
    schemeByItemId,
  };
};

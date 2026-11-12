/**
 * Чистая модель разделов чеклиста без React/CSS.
 * Используется полноразмерной корзиной и адаптером мини-корзинки.
 */

export type ChecklistItem = {
  id: string;
  checked: boolean;
  qualityControl: boolean;
  code: string;
  title: string;
  info: string;
  infoComment?: string;
  comment: string;
  treatmentPlan?: string;
  treatmentDuration?: string;
  sourceIds?: string[];
  mergedItems?: ChecklistItem[];
};

export type ChecklistSection = {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle?: string;
  groupTitle: string;
  items: ChecklistItem[];
};

export type SelectedPrescription = {
  id: string;
  categoryId?: string;
  categoryTitle?: string;
  groupTitle: string;
  sectionTitle: string;
  title: string;
  comment: string;
  treatmentPlan?: string;
  treatmentDuration?: string;
};

export type AppendixA3Table = {
  name: string | null;
  html: string;
  comment: string | null;
};

const comparePriorityValues = (left: string, right: string) => {
  const leftValue = left.trim();
  const rightValue = right.trim();

  if (!leftValue) return 1;
  if (!rightValue) return -1;

  const leftNumber = Number(leftValue.replace(",", "."));
  const rightNumber = Number(rightValue.replace(",", "."));
  const leftIsNumber = Number.isFinite(leftNumber);
  const rightIsNumber = Number.isFinite(rightNumber);

  if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return leftValue.localeCompare(rightValue, "ru", {
    numeric: true,
    sensitivity: "base",
  });
};

const getPriorityString = (left: string, right: string) =>
  comparePriorityValues(left, right) <= 0 ? left : right;

const getItemIds = (item: ChecklistItem) => item.sourceIds ?? [item.id];

const getMergedItems = (item: ChecklistItem) => item.mergedItems ?? [item];

const mergeChecklistItemsByTitle = (items: ChecklistItem[]) => {
  const mergedItems = new Map<string, ChecklistItem>();

  items.forEach((item) => {
    const titleKey = item.title.trim().toLocaleLowerCase("ru");
    const existingItem = mergedItems.get(titleKey);

    if (!existingItem) {
      mergedItems.set(titleKey, {
        ...item,
        sourceIds: getItemIds(item),
        mergedItems: getMergedItems(item),
      });
      return;
    }

    const nextMergedItems = [
      ...getMergedItems(existingItem),
      ...getMergedItems(item),
    ]
      .slice()
      .sort((left, right) => {
        const codeComparison = comparePriorityValues(left.code, right.code);

        if (codeComparison !== 0) return codeComparison;

        return comparePriorityValues(left.id, right.id);
      });

    mergedItems.set(titleKey, {
      ...existingItem,
      id: getPriorityString(existingItem.id, item.id),
      checked: existingItem.checked || item.checked,
      qualityControl: existingItem.qualityControl || item.qualityControl,
      code: getPriorityString(existingItem.code, item.code),
      title: getPriorityString(existingItem.title, item.title),
      info: getPriorityString(existingItem.info, item.info),
      infoComment: getPriorityString(
        existingItem.infoComment ?? "",
        item.infoComment ?? "",
      ),
      comment: existingItem.comment || item.comment,
      treatmentPlan: existingItem.treatmentPlan || item.treatmentPlan,
      treatmentDuration:
        existingItem.treatmentDuration || item.treatmentDuration,
      sourceIds: Array.from(
        new Set([...getItemIds(existingItem), ...getItemIds(item)]),
      ),
      mergedItems: nextMergedItems,
    });
  });

  return Array.from(mergedItems.values());
};

export const mergeChecklistSectionsByTitle = (sections: ChecklistSection[]) =>
  sections.map((section) => ({
    ...section,
    items: mergeChecklistItemsByTitle(section.items),
  }));

export const defaultChecklistCategories = [
  { id: "required-diagnostics", label: "Диагностика обязательная" },
  { id: "indicated-diagnostics", label: "Диагностика по показаниям" },
  { id: "treatment", label: "Лечение" },
  { id: "medications", label: "Препараты" },
  { id: "scales", label: "Шкалы и опросники" },
  { id: "lifestyle", label: "Образ жизни" },
  { id: "vaccination", label: "Вакцинация" },
  { id: "appendix-a3", label: "Приложение А3" },
];

export const getChecklistCategoryPosition = (categoryId?: string) => {
  const position = defaultChecklistCategories.findIndex(
    (category) => category.id === categoryId,
  );

  return position === -1 ? Number.MAX_SAFE_INTEGER : position;
};

const normalizeSectionTitle = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

const genericHiddenSectionTitlesByCategory = new Map<string, Set<string>>([
  ["treatment", new Set(["немедикаментозное лечение"])],
  ["medications", new Set(["медикаментозное лечение"])],
]);

export const shouldShowSectionTitle = (section: ChecklistSection) =>
  !genericHiddenSectionTitlesByCategory
    .get(section.categoryId)
    ?.has(normalizeSectionTitle(section.title));

const OFFLABEL_SECTION_TITLE = "Offlabel";

const isOfflabelSection = (section: ChecklistSection) =>
  section.categoryId === "medications" &&
  normalizeSectionTitle(section.title) ===
    normalizeSectionTitle(OFFLABEL_SECTION_TITLE);

export const sortSectionsForDisplay = (sections: ChecklistSection[]) =>
  sections.slice().sort((left, right) => {
    if (left.categoryId !== "medications" || right.categoryId !== "medications") {
      return 0;
    }

    if (isOfflabelSection(left) === isOfflabelSection(right)) return 0;

    return isOfflabelSection(left) ? 1 : -1;
  });

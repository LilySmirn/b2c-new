"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  assignmentFromDraft,
  clearedAssignmentDraft,
  combinationAssignmentView,
  displayedAssignmentComment,
  hasCustomAssignment,
  standardRecommendationComment,
  tableScheduleValue,
  type AssignmentCommentSource,
  type AssignmentFieldState,
} from "./medications/assignmentScheme";
import DrugInfoModal, {
  EMPTY_MEDICATION_INTAKE,
  type MedicationIntake,
} from "./medications/DrugInfoModal";
import DrugRow, { type MedicationField } from "./medications/DrugRow";
import InteractionsPanel from "./medications/InteractionsPanel";
import SchemeWizard from "./medications/SchemeWizard";
import {
  combinationSelectionSummary,
  sanitizeCombinationDraft,
  type CombinationDraft,
} from "./medications/combinationSelection";
import { persistBrowserCombinationSelection, readBrowserCombinationSelections } from "./medications/combinationSelectionStorage";
import { applyMedsSelection, buildMedsRowView, matchMedsDrugForItem } from "./medications/medsClient";
import type { MedsCatalogComponent, MedsRowSelection } from "./medications/medsCatalogTypes";
import medicationStyles from "./medications/medications.module.css";
import { useMedsCatalog } from "./medications/useMedsCatalog";
import styles from "./PrescriptionChecklist.module.css";

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

const itemMatchesId = (item: ChecklistItem, id: string) =>
  getItemIds(item).includes(id);

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

const mergeChecklistSectionsByTitle = (sections: ChecklistSection[]) =>
  sections.map((section) => ({
    ...section,
    items: mergeChecklistItemsByTitle(section.items),
  }));

const defaultChecklistCategories = [
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

const shouldShowSectionTitle = (section: ChecklistSection) =>
  !genericHiddenSectionTitlesByCategory
    .get(section.categoryId)
    ?.has(normalizeSectionTitle(section.title));

const OFFLABEL_SECTION_TITLE = "Offlabel";

const isOfflabelSection = (section: ChecklistSection) =>
  section.categoryId === "medications" &&
  normalizeSectionTitle(section.title) === normalizeSectionTitle(OFFLABEL_SECTION_TITLE);

const sortSectionsForDisplay = (sections: ChecklistSection[]) =>
  sections.slice().sort((left, right) => {
    if (left.categoryId !== "medications" || right.categoryId !== "medications") {
      return 0;
    }

    if (isOfflabelSection(left) === isOfflabelSection(right)) return 0;

    return isOfflabelSection(left) ? 1 : -1;
  });

const getFirstAvailableCategoryId = (sections: ChecklistSection[]) => {
  const availableCategoryIds = new Set(sections.map((section) => section.categoryId));

  return (
    defaultChecklistCategories.find((category) =>
      availableCategoryIds.has(category.id),
    )?.id ??
    sections[0]?.categoryId ??
    defaultChecklistCategories[0].id
  );
};

type MedicationDraft = Partial<Record<MedicationField, string>> & {
  inn?: string;
  trade?: string;
  recordId?: string;
};

const readMedicationField = (
  drafts: Record<string, MedicationDraft>,
  item: ChecklistItem,
  field: MedicationField,
) => drafts[item.id]?.[field] ?? "";

type PrescriptionChecklistProps = {
  onSelectionChange?: (items: SelectedPrescription[]) => void;
  uncheckItemId?: string | null;
  onUncheckHandled?: () => void;
  clearSelectionSignal?: number;
  initialSections?: ChecklistSection[];
  appliedTemplateItems?: SelectedPrescription[] | null;
  appendixA3Tables?: AppendixA3Table[];
  isAppendixA3Loading?: boolean;
  appendixA3Error?: string;
  medsRecommendationKey?: string;
};

export default function PrescriptionChecklist({
  onSelectionChange,
  uncheckItemId,
  onUncheckHandled,
  clearSelectionSignal = 0,
  initialSections = [],
  appliedTemplateItems = null,
  appendixA3Tables = [],
  isAppendixA3Loading = false,
  appendixA3Error = "",
  medsRecommendationKey = "",
}: PrescriptionChecklistProps) {
  const [sections, setSections] = useState(() =>
    mergeChecklistSectionsByTitle(initialSections),
  );
  const categoryAvailability = useMemo(() => {
    const categoryTitles = new Map<string, string>();
    const availableCategoryIds = new Set<string>();

    sections.forEach((section) => {
      availableCategoryIds.add(section.categoryId);
      categoryTitles.set(
        section.categoryId,
        section.categoryTitle ?? section.groupTitle,
      );
    });

    if (isAppendixA3Loading || appendixA3Error || appendixA3Tables.length > 0) {
      availableCategoryIds.add("appendix-a3");
    }

    return { availableCategoryIds, categoryTitles };
  }, [appendixA3Error, appendixA3Tables.length, isAppendixA3Loading, sections]);
  const checklistCategories = useMemo(() => {
    const defaultCategoryIds = new Set(
      defaultChecklistCategories.map((category) => category.id),
    );
    const extraCategories = Array.from(
      categoryAvailability.categoryTitles.entries(),
    )
      .filter(([categoryId]) => !defaultCategoryIds.has(categoryId))
      .map(([id, label]) => ({ id, label }));

    return [
      ...defaultChecklistCategories.map((category) => ({
        ...category,
        label:
          categoryAvailability.categoryTitles.get(category.id) ??
          category.label,
      })),
      ...extraCategories,
    ];
  }, [categoryAvailability.categoryTitles]);
  const [activeCategoryId, setActiveCategoryId] = useState(() =>
    getFirstAvailableCategoryId(initialSections),
  );
  const [infoTarget, setInfoTarget] = useState<ChecklistItem | null>(null);
  const [activeInfoItemId, setActiveInfoItemId] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [medicationDrafts, setMedicationDrafts] = useState<
    Record<string, MedicationDraft>
  >({});
  const [medicationIntake, setMedicationIntake] = useState<
    Record<string, MedicationIntake>
  >({});
  const [commentSources, setCommentSources] = useState<Record<string, AssignmentCommentSource>>({});
  const commentSourcesRef = useRef(commentSources);
  commentSourcesRef.current = commentSources;
  const [combinationByItemId, setCombinationByItemId] = useState<
    Record<string, CombinationDraft>
  >({});
  const [schemeSession, setSchemeSession] = useState<{
    itemId: string;
    title: string;
    components: readonly MedsCatalogComponent[];
    confirmed: CombinationDraft | null;
  } | null>(null);
  const medsCatalogState = useMedsCatalog(medsRecommendationKey);
  const drugForItem = (item: ChecklistItem) =>
    matchMedsDrugForItem(medsCatalogState.catalog, medsCatalogState.query, item);

  useEffect(() => {
    setSchemeSession(null);
    setCombinationByItemId(readBrowserCombinationSelections(medsRecommendationKey));
  }, [medsRecommendationKey]);

  const toggleChecked = (id: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          if (!itemMatchesId(item, id)) return item;

          const checked = !item.checked;

          return {
            ...item,
            checked,
            comment: checked ? item.comment : "",
          };
        }),
      })),
    );
  };

  const openInfo = (item: ChecklistItem) => {
    setInfoTarget(item);
    setActiveInfoItemId(getMergedItems(item)[0]?.id ?? item.id);
  };

  const closeInfo = () => {
    setInfoTarget(null);
    setActiveInfoItemId(null);
  };

  useEffect(() => {
    const mergedSections = mergeChecklistSectionsByTitle(initialSections);

    setSections(mergedSections);
    setActiveCategoryId(getFirstAvailableCategoryId(mergedSections));
    setMedicationDrafts({});
    setMedicationIntake({});
    commentSourcesRef.current = {};
    setCommentSources({});
  }, [initialSections]);

  useEffect(() => {
    if (
      sections.length === 0 ||
      categoryAvailability.availableCategoryIds.has(activeCategoryId)
    ) {
      return;
    }

    setActiveCategoryId(checklistCategories[0]?.id ?? defaultChecklistCategories[0].id);
  }, [
    activeCategoryId,
    categoryAvailability.availableCategoryIds,
    checklistCategories,
    sections.length,
  ]);

  const toggleRequiredDiagnostics = () => {
    setSections((prev) => {
      const requiredItems = prev.flatMap((section) =>
        section.categoryId === "required-diagnostics" ? section.items : [],
      );
      const shouldCheckAll = requiredItems.some((item) => !item.checked);

      return prev.map((section) =>
        section.categoryId === "required-diagnostics"
          ? {
              ...section,
              items: section.items.map((item) => ({
                ...item,
                checked: shouldCheckAll,
                comment: shouldCheckAll ? item.comment : "",
              })),
            }
          : section,
      );
    });
  };

  const writeCommentSource = (id: string, source: AssignmentCommentSource) => {
    const next = { ...commentSourcesRef.current, [id]: source };
    commentSourcesRef.current = next;
    setCommentSources(next);
  };

  const clearCommentSources = (ids: readonly string[]) => {
    const next = { ...commentSourcesRef.current };
    let changed = false;

    ids.forEach((id) => {
      if (!(id in next)) return;
      delete next[id];
      changed = true;
    });

    if (!changed) return;

    commentSourcesRef.current = next;
    setCommentSources(next);
  };

  const commentSourceOf = (item: ChecklistItem): AssignmentCommentSource => {
    const ids = [item.id, ...getItemIds(item)];
    if (ids.some((id) => commentSources[id] === "user")) return "user";
    if (ids.some((id) => commentSources[id] === "none")) return "none";

    return "clinical-recommendation";
  };

  const commentSourceForId = (id: string): AssignmentCommentSource => {
    const item = sections
      .flatMap((section) => section.items)
      .find((entry) => entry.id === id || itemMatchesId(entry, id));

    if (!item) return commentSourcesRef.current[id] ?? "clinical-recommendation";

    const ids = [item.id, ...getItemIds(item)];
    if (ids.some((key) => commentSourcesRef.current[key] === "user")) return "user";
    if (ids.some((key) => commentSourcesRef.current[key] === "none")) return "none";

    return "clinical-recommendation";
  };

  const saveComment = () => {
    if (!commentTarget) return;

    const trimmedComment = commentTarget.value.trim();

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, commentTarget.id)
            ? {
                ...item,
                checked: trimmedComment ? true : item.checked,
                comment: trimmedComment,
              }
            : item,
        ),
      })),
    );
    writeCommentSource(commentTarget.id, "user");
    setCommentTarget(null);
  };

  useEffect(() => {
    if (!commentTarget) return;

    commentInputRef.current?.focus();
  }, [commentTarget]);

  useEffect(() => {
    onSelectionChange?.(
      sections.flatMap((section) =>
        section.items
          .filter((item) => item.checked)
          .map((item) => ({
            id: item.id,
            categoryId: section.categoryId,
            categoryTitle:
              section.categoryTitle ??
              checklistCategories.find((category) => category.id === section.categoryId)
                ?.label ??
              section.groupTitle,
            groupTitle: section.groupTitle,
            sectionTitle: section.title,
            title: item.title,
            comment: item.comment,
            treatmentPlan: item.treatmentPlan,
            treatmentDuration: item.treatmentDuration,
          })),
      ),
    );
  }, [checklistCategories, onSelectionChange, sections]);

  useEffect(() => {
    if (!appliedTemplateItems) return;

    const templateItemMap = new Map(
      appliedTemplateItems.map((item) => [item.id, item]),
    );

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) => {
          const templateItem = getItemIds(item)
            .map((id) => templateItemMap.get(id))
            .find(Boolean);

          return {
            ...item,
            checked: Boolean(templateItem),
            comment: templateItem?.comment ?? item.comment,
          };
        }),
      })),
    );
    setCommentSources((current) => {
      const next = { ...current };

      appliedTemplateItems.forEach((item) => {
        if (item.comment.trim()) next[item.id] = "user";
      });

      commentSourcesRef.current = next;
      return next;
    });
  }, [appliedTemplateItems]);

  useEffect(() => {
    if (!uncheckItemId) return;

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, uncheckItemId)
            ? { ...item, checked: false, comment: "" }
            : item,
        ),
      })),
    );
    onUncheckHandled?.();
  }, [onUncheckHandled, uncheckItemId]);

  useEffect(() => {
    if (clearSelectionSignal === 0) return;

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          checked: false,
          comment: "",
        })),
      })),
    );
  }, [clearSelectionSignal]);

  const readMedsSelection = (item: ChecklistItem): MedsRowSelection => ({
    inn: medicationDrafts[item.id]?.inn ?? "",
    trade: medicationDrafts[item.id]?.trade ?? "",
    dose: readMedicationField(medicationDrafts, item, "dose"),
    form: readMedicationField(medicationDrafts, item, "form"),
    recordId: medicationDrafts[item.id]?.recordId ?? "",
  });

  const commitMedsSelection = (
    item: ChecklistItem,
    patch: Partial<Pick<MedsRowSelection, "inn" | "trade" | "dose" | "form">>,
  ) => {
    const drug = drugForItem(item);

    setMedicationDrafts((current) => {
      const draft = current[item.id] ?? {};
      const next = applyMedsSelection(
        drug,
        {
          inn: draft.inn ?? "",
          trade: draft.trade ?? "",
          dose: draft.dose ?? "",
          form: draft.form ?? "",
          recordId: draft.recordId ?? "",
        },
        patch,
      );

      return {
        ...current,
        [item.id]: {
          ...draft,
          ...next,
        },
      };
    });

    const draft = medicationDrafts[item.id] ?? {};
    const next = applyMedsSelection(
      drug,
      {
        inn: draft.inn ?? "",
        trade: draft.trade ?? "",
        dose: draft.dose ?? "",
        form: draft.form ?? "",
        recordId: draft.recordId ?? "",
      },
      patch,
    );
    dropAutoCommentIfCustom(item.id, assignmentFromDraft({ ...draft, ...next }, medicationIntake[item.id]));
  };

  const updateMedicationField = (
    id: string,
    field: MedicationField,
    value: string,
  ) => {
    const item = sections
      .flatMap((section) => section.items)
      .find((entry) => entry.id === id);

    if (item && (field === "dose" || field === "form")) {
      commitMedsSelection(item, { [field]: value });
      return;
    }

    setMedicationDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [field]: value,
      },
    }));
    dropAutoCommentIfCustom(
      id,
      assignmentFromDraft(
        { ...medicationDrafts[id], [field]: value },
        medicationIntake[id],
      ),
    );
  };

  const updateMedicationComment = (id: string, value: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, id) ? { ...item, comment: value } : item,
        ),
      })),
    );
  };

  const updateMedicationIntake = (id: string, intake: MedicationIntake) => {
    setMedicationIntake((current) => ({
      ...current,
      [id]: intake,
    }));
    dropAutoCommentIfCustom(id, assignmentFromDraft(medicationDrafts[id], intake));
  };

  const dropAutoCommentIfCustom = (id: string, fields: AssignmentFieldState) => {
    if (!hasCustomAssignment(fields)) return;
    if (commentSourceForId(id) !== "clinical-recommendation") return;

    writeCommentSource(id, "none");
    updateMedicationComment(id, "");
  };

  const scheduleFor = (item: ChecklistItem) => {
    const fields = assignmentFromDraft(medicationDrafts[item.id], medicationIntake[item.id]);
    const custom = hasCustomAssignment(fields);

    return {
      fields,
      tableScheme: tableScheduleValue(fields.schemeText, item.treatmentPlan ?? "", custom),
      tableCourse: tableScheduleValue(fields.courseText, item.treatmentDuration ?? "", custom),
    };
  };

  const resetMedicationAssignment = (item: ChecklistItem) => {
    setMedicationDrafts((current) => {
      const draft = current[item.id] ?? {};
      const selection = applyMedsSelection(
        drugForItem(item),
        {
          inn: draft.inn ?? "",
          trade: draft.trade ?? "",
          dose: draft.dose ?? "",
          form: draft.form ?? "",
          recordId: draft.recordId ?? "",
        },
        { dose: "", form: "" },
      );

      return {
        ...current,
        [item.id]: clearedAssignmentDraft(selection),
      };
    });
    setMedicationIntake((current) => {
      if (!current[item.id]) return current;

      const next = { ...current };
      delete next[item.id];
      return next;
    });
    clearCommentSources([item.id, ...getItemIds(item)]);
    updateMedicationComment(
      item.id,
      standardRecommendationComment(item.treatmentPlan ?? "", item.treatmentDuration ?? ""),
    );
  };

  const confirmCombination = (itemId: string, draft: CombinationDraft) => {
    setCombinationByItemId((current) => ({
      ...current,
      [itemId]: draft,
    }));
    persistBrowserCombinationSelection(medsRecommendationKey, itemId, draft);
    setSchemeSession(null);
  };

  const applyOriginalRecommendation = (item: ChecklistItem) => {
    const scheme = item.treatmentPlan ?? "";
    const course = item.treatmentDuration ?? "";
    if (!scheme.trim() && !course.trim()) return;

    setMedicationDrafts((current) => {
      const draft = current[item.id] ?? {};

      return {
        ...current,
        [item.id]: clearedAssignmentDraft({
          inn: draft.inn ?? "",
          trade: draft.trade ?? "",
          recordId: draft.recordId ?? "",
        }),
      };
    });
    setMedicationIntake((current) => {
      if (!current[item.id]) return current;

      const next = { ...current };
      delete next[item.id];
      return next;
    });
  };

  const visibleSections = sortSectionsForDisplay(
    sections.filter((section) => section.categoryId === activeCategoryId),
  );

  const requiredDiagnosticsSections = sections.filter(
    (section) => section.categoryId === "required-diagnostics",
  );
  const firstRequiredDiagnosticsSectionId = requiredDiagnosticsSections[0]?.id;
  const requiredDiagnosticsItems = requiredDiagnosticsSections.flatMap(
    (section) => section.items,
  );
  const allRequiredDiagnosticsChecked =
    requiredDiagnosticsItems.length > 0 &&
    requiredDiagnosticsItems.every((item) => item.checked);
  const infoSection = infoTarget
    ? sections.find((section) =>
        section.items.some((item) => item.id === infoTarget.id),
      )
    : undefined;
  const liveInfoItem =
    infoSection?.items.find((item) => item.id === infoTarget?.id) ?? infoTarget;
  const isMedicationInfo =
    infoSection?.categoryId === "medications" && Boolean(liveInfoItem);
  const medicationDescriptionSource = liveInfoItem
    ? (getMergedItems(liveInfoItem).find((item) => item.id === activeInfoItemId) ??
      getMergedItems(liveInfoItem)[0] ??
      liveInfoItem)
    : null;
  const liveEntry = liveInfoItem ? drugForItem(liveInfoItem) : null;
  const liveMedsView = liveInfoItem
    ? buildMedsRowView(liveEntry, readMedsSelection(liveInfoItem))
    : null;
  const liveComponents =
    liveEntry?.type === "combination" ? liveEntry.combination_data : null;
  const liveCombination =
    liveInfoItem && liveComponents
      ? sanitizeCombinationDraft(liveComponents, combinationByItemId[liveInfoItem.id])
      : null;
  const liveCombinationView =
    liveInfoItem && liveComponents
      ? combinationAssignmentView(liveInfoItem.title, liveComponents, liveCombination)
      : null;
  const liveSchedule = liveInfoItem ? scheduleFor(liveInfoItem) : null;

  const closeMedicationInfo = () => {
    if (liveInfoItem) {
      const trimmedComment = liveInfoItem.comment.trim();
      if (trimmedComment !== liveInfoItem.comment) {
        updateMedicationComment(liveInfoItem.id, trimmedComment);
      }
    }

    closeInfo();
  };

  return (
    <div className={styles.checklistWrapper}>
      <div
        className={styles.categoryTabs}
        role="tablist"
        aria-label="Раздел назначений"
      >
        {checklistCategories.map((category) => {
          const isActive = activeCategoryId === category.id;
          const isDisabled = !categoryAvailability.availableCategoryIds.has(
            category.id,
          );

          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              className={`${styles.categoryTab} ${
                isActive ? styles.categoryTabActive : ""
              } ${isDisabled ? styles.categoryTabDisabled : ""}`}
              onClick={() => {
                if (!isDisabled) {
                  setActiveCategoryId(category.id);
                }
              }}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className={styles.checklistScroll}>
        <div className={styles.tableArea}>
          {activeCategoryId === "appendix-a3" ? (
            <div className={styles.appendixA3Panel}>
              {isAppendixA3Loading ? (
                <p className={styles.appendixA3Message}>Загружаем таблицы приложения А3...</p>
              ) : appendixA3Error ? (
                <p className={styles.appendixA3Error}>{appendixA3Error}</p>
              ) : appendixA3Tables.length === 0 ? (
                <p className={styles.appendixA3Message}>
                  Для выбранной клинической рекомендации таблицы приложения А3 не найдены.
                </p>
              ) : (
                appendixA3Tables.map((table, index) => (
                  <section key={`${table.name ?? "appendix-a3"}-${index}`} className={styles.appendixA3TableBlock}>
                    {table.name ? <h3 className={styles.appendixA3Title}>{table.name}</h3> : null}
                    <div
                      className={styles.appendixA3TableHtml}
                      dangerouslySetInnerHTML={{ __html: table.html }}
                    />
                    {table.comment ? <p className={styles.appendixA3Comment}>{table.comment}</p> : null}
                  </section>
                ))
              )}
            </div>
          ) : null}

          {activeCategoryId !== "appendix-a3" ? (
            <div
              className={
                activeCategoryId === "medications" && visibleSections.length > 0
                  ? medicationStyles.sheet
                  : undefined
              }
            >
          {visibleSections.map((section) => (
            <div key={section.id} className={styles.sectionBlock}>
              {shouldShowSectionTitle(section) ? (
                <div
                  className={`${styles.sectionRow} ${
                    activeCategoryId === "required-diagnostics"
                      ? styles.requiredDiagnosticsSectionRow
                      : ""
                  } ${
                    activeCategoryId === "required-diagnostics" &&
                    section.id !== firstRequiredDiagnosticsSectionId
                      ? styles.sectionRowWithoutCheckbox
                      : ""
                  }`}
                >
                  {activeCategoryId === "required-diagnostics" &&
                  section.id === firstRequiredDiagnosticsSectionId ? (
                    <button
                      type="button"
                      className={`${styles.checkbox} ${
                        allRequiredDiagnosticsChecked
                          ? styles.checkboxChecked
                          : ""
                      }`}
                      onClick={toggleRequiredDiagnostics}
                      aria-label="Выбрать всю обязательную диагностику"
                      aria-pressed={allRequiredDiagnosticsChecked}
                    >
                      {allRequiredDiagnosticsChecked ? "✓" : ""}
                    </button>
                  ) : null}
                  <span>{section.title}</span>
                </div>
              ) : null}

              {section.items.map((item) => {
                const entry =
                  activeCategoryId === "medications" ? drugForItem(item) : null;
                const medsView =
                  activeCategoryId === "medications"
                    ? buildMedsRowView(entry, readMedsSelection(item))
                    : null;
                const components =
                  entry?.type === "combination" ? entry.combination_data : null;
                const confirmedScheme = components
                  ? sanitizeCombinationDraft(components, combinationByItemId[item.id])
                  : null;
                const schedule = scheduleFor(item);

                return activeCategoryId === "medications" && medsView ? (
                  <DrugRow
                    key={item.id}
                    item={item}
                    dose={readMedicationField(medicationDrafts, item, "dose")}
                    form={readMedicationField(medicationDrafts, item, "form")}
                    scheme={schedule.tableScheme}
                    course={schedule.tableCourse}
                    doseOptions={medsView.doseOptions}
                    formOptions={medsView.formOptions}
                    nameMenu={medsView.nameMenu}
                    schemeDrugCount={components?.length}
                    schemeSummary={
                      components
                        ? combinationSelectionSummary(components, confirmedScheme)
                        : ""
                    }
                    schemeOpen={schemeSession?.itemId === item.id}
                    onOpenScheme={
                      components
                        ? () =>
                            setSchemeSession({
                              itemId: item.id,
                              title: item.title,
                              components,
                              confirmed: confirmedScheme,
                            })
                        : undefined
                    }
                    onToggle={toggleChecked}
                    onOpenInfo={openInfo}
                    onOpenComment={(id, comment) =>
                      setCommentTarget({ id, value: comment })
                    }
                    onChangeField={updateMedicationField}
                    onSelectInn={(_id, inn) => commitMedsSelection(item, { inn })}
                    onSelectTrade={(_id, trade) => commitMedsSelection(item, { trade })}
                  />
                ) : (
                <article
                  key={item.id}
                  className={styles.row}
                  onClick={() => toggleChecked(item.id)}
                >
                  <div className={styles.firstCol}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleChecked(item.id);
                      }}
                      aria-label={`Выбрать ${item.title}`}
                    >
                      {item.checked ? "✓" : ""}
                    </button>
                    <span className={styles.qcValue}>
                      {item.qualityControl ? "КК" : ""}
                    </span>
                    <span
                      className={`${styles.codeValue} ${
                        item.code ? "" : styles.codeValueEmpty
                      }`}
                      aria-hidden={!item.code}
                    >
                      {item.code}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.secondCol}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleChecked(item.id);
                    }}
                    aria-pressed={item.checked}
                    aria-label={`Выбрать ${item.title}`}
                  >
                    {item.title}
                  </button>

                  <div className={styles.thirdCol}>
                    <button
                      type="button"
                      className={styles.infoButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openInfo(item);
                      }}
                      aria-label={`Информация о назначении ${item.title}`}
                    >
                      i
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`${styles.commentCol} ${
                      item.comment ? styles.commentColFilled : ""
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setCommentTarget({ id: item.id, value: item.comment });
                    }}
                  >
                    {item.comment || "Комментарий..."}
                  </button>
                </article>
                );
              })}
            </div>
          ))}
            </div>
          ) : null}
          {activeCategoryId !== "appendix-a3" && visibleSections.length === 0 ? (
            <div className={styles.emptyState}>
              В этом разделе пока нет назначений
            </div>
          ) : null}
        </div>
      </div>

      {/* Временный режим: панель всегда видна на «Препаратах», без проверки совместимости. */}
      {activeCategoryId === "medications" ? <InteractionsPanel /> : null}

      {schemeSession ? (
        <SchemeWizard
          key={schemeSession.itemId}
          title={schemeSession.title}
          components={schemeSession.components}
          confirmed={schemeSession.confirmed}
          onClose={() => setSchemeSession(null)}
          onConfirm={(draft) => confirmCombination(schemeSession.itemId, draft)}
        />
      ) : null}

      {isMedicationInfo && liveInfoItem ? (
        <DrugInfoModal
          title={liveInfoItem.title}
          qualityControl={liveInfoItem.qualityControl}
          recommendationLevel={liveInfoItem.code}
          checked={liveInfoItem.checked}
          dose={readMedicationField(medicationDrafts, liveInfoItem, "dose")}
          form={readMedicationField(medicationDrafts, liveInfoItem, "form")}
          scheme={liveSchedule?.fields.schemeText ?? ""}
          course={liveSchedule?.fields.courseText ?? ""}
          comment={displayedAssignmentComment(
            {
              text: liveInfoItem.comment,
              source: commentSourceOf(liveInfoItem),
            },
            hasCustomAssignment(liveSchedule?.fields ?? assignmentFromDraft(undefined)),
          )}
          intake={medicationIntake[liveInfoItem.id] ?? EMPTY_MEDICATION_INTAKE}
          description={medicationDescriptionSource?.info || "Описание отсутствует"}
          infoComment={medicationDescriptionSource?.infoComment ?? ""}
          originalScheme={liveInfoItem.treatmentPlan ?? ""}
          originalCourse={liveInfoItem.treatmentDuration ?? ""}
          tradeName={medicationDrafts[liveInfoItem.id]?.trade ?? ""}
          innName={medicationDrafts[liveInfoItem.id]?.inn ?? ""}
          catalogOptions={{
            doses: liveMedsView?.doseOptions ?? [],
            forms: liveMedsView?.formOptions ?? [],
          }}
          noteCustom={commentSourceOf(liveInfoItem) === "user"}
          combination={liveCombinationView}
          dismissLocked={schemeSession?.itemId === liveInfoItem.id}
          onOpenScheme={
            liveComponents
              ? () =>
                  setSchemeSession({
                    itemId: liveInfoItem.id,
                    title: liveInfoItem.title,
                    components: liveComponents,
                    confirmed: liveCombination,
                  })
              : undefined
          }
          onClose={closeMedicationInfo}
          onToggleCart={() => toggleChecked(liveInfoItem.id)}
          onChangeField={(field, value) =>
            updateMedicationField(liveInfoItem.id, field, value)
          }
          onCommentChange={(value) => {
            updateMedicationComment(liveInfoItem.id, value);
            writeCommentSource(liveInfoItem.id, "user");
          }}
          onIntakeChange={(intake) => updateMedicationIntake(liveInfoItem.id, intake)}
          onReset={() => resetMedicationAssignment(liveInfoItem)}
          onApplyOriginal={() => applyOriginalRecommendation(liveInfoItem)}
        />
      ) : null}

      {infoTarget && !isMedicationInfo ? (
        <div className={styles.modalOverlay} onClick={closeInfo}>
          <div
            className={`${styles.modal} ${styles.infoModal}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>{infoTarget.title}</h3>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closeInfo}
                aria-label="Закрыть окно информации"
              >
                ×
              </button>
            </div>
            <div className={styles.infoTabs} role="tablist">
              {getMergedItems(infoTarget).map((item) => {
                const isActive = activeInfoItemId === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.infoTab} ${
                      isActive ? styles.infoTabActive : ""
                    }`}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveInfoItemId(item.id)}
                  >
                    {[item.qualityControl ? "КК" : "", item.code]
                      .filter(Boolean)
                      .join(" · ") || "Без КК"}
                  </button>
                );
              })}
            </div>
            {getMergedItems(infoTarget)
              .filter((item) => item.id === activeInfoItemId)
              .map((item) => (
                <div
                  key={item.id}
                  className={styles.infoTabPanel}
                  role="tabpanel"
                >
                  <div className={styles.infoSection}>
                    <strong>Описание:</strong>
                    <p>{item.info || "Описание отсутствует"}</p>
                  </div>
                  <div className={styles.infoSection}>
                    <strong>Комментарий:</strong>
                    <p>{item.infoComment || "Комментарий отсутствует"}</p>
                  </div>
                </div>
              ))}
            <button
              type="button"
              className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              onClick={closeInfo}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      {commentTarget && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCommentTarget(null)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Комментарий врача</h3>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setCommentTarget(null)}
                aria-label="Закрыть окно комментария"
              >
                ×
              </button>
            </div>
            <textarea
              ref={commentInputRef}
              className={styles.commentInput}
              value={commentTarget.value}
              onChange={(event) =>
                setCommentTarget((prev) =>
                  prev ? { ...prev, value: event.target.value } : null,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  saveComment();
                }
              }}
              placeholder="Комментарий..."
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                onClick={() => setCommentTarget(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                onClick={saveComment}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
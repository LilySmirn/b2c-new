"use client";

import { useEffect, useMemo, useState } from "react";
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
  groupTitle: string;
  sectionTitle: string;
  title: string;
  comment: string;
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

type PrescriptionChecklistProps = {
  onSelectionChange?: (items: SelectedPrescription[]) => void;
  uncheckItemId?: string | null;
  onUncheckHandled?: () => void;
  clearSelectionSignal?: number;
  initialSections?: ChecklistSection[];
  appliedTemplateItems?: SelectedPrescription[] | null;
};

export default function PrescriptionChecklist({
  onSelectionChange,
  uncheckItemId,
  onUncheckHandled,
  clearSelectionSignal = 0,
  initialSections = [],
  appliedTemplateItems = null,
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

    return { availableCategoryIds, categoryTitles };
  }, [sections]);
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
  const [activeCategoryId, setActiveCategoryId] = useState(
    initialSections[0]?.categoryId ?? defaultChecklistCategories[0].id,
  );
  const [infoTarget, setInfoTarget] = useState<ChecklistItem | null>(null);
  const [activeInfoItemId, setActiveInfoItemId] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const toggleChecked = (id: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, id) ? { ...item, checked: !item.checked } : item,
        ),
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
    setActiveCategoryId(
      mergedSections[0]?.categoryId ?? defaultChecklistCategories[0].id,
    );
  }, [initialSections]);

  useEffect(() => {
    if (
      sections.length === 0 ||
      categoryAvailability.availableCategoryIds.has(activeCategoryId)
    ) {
      return;
    }

    setActiveCategoryId(sections[0].categoryId);
  }, [activeCategoryId, categoryAvailability.availableCategoryIds, sections]);

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
              })),
            }
          : section,
      );
    });
  };

  const saveComment = () => {
    if (!commentTarget) return;

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, commentTarget.id)
            ? { ...item, comment: commentTarget.value.trim() }
            : item,
        ),
      })),
    );
    setCommentTarget(null);
  };

  useEffect(() => {
    onSelectionChange?.(
      sections.flatMap((section) =>
        section.items
          .filter((item) => item.checked)
          .map((item) => ({
            id: item.id,
            groupTitle: section.groupTitle,
            sectionTitle: section.title,
            title: item.title,
            comment: item.comment,
          })),
      ),
    );
  }, [onSelectionChange, sections]);

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
  }, [appliedTemplateItems]);

  useEffect(() => {
    if (!uncheckItemId) return;

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          itemMatchesId(item, uncheckItemId)
            ? { ...item, checked: false }
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
        items: section.items.map((item) => ({ ...item, checked: false })),
      })),
    );
  }, [clearSelectionSignal]);

  const visibleSections = sections.filter(
    (section) => section.categoryId === activeCategoryId,
  );

  const allRequiredDiagnosticsChecked = sections
    .filter((section) => section.categoryId === "required-diagnostics")
    .flatMap((section) => section.items)
    .every((item) => item.checked);

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
          {visibleSections.map((section) => (
            <div key={section.id} className={styles.sectionBlock}>
              <div
                className={`${styles.sectionRow} ${
                  activeCategoryId === "required-diagnostics"
                    ? styles.requiredDiagnosticsSectionRow
                    : ""
                } ${
                  activeCategoryId === "required-diagnostics" &&
                  section.id !== "lab"
                    ? styles.sectionRowWithoutCheckbox
                    : ""
                }`}
              >
                {section.id === "lab" ? (
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

              {section.items.map((item) => (
                <article key={item.id} className={styles.row}>
                  <div className={styles.firstCol}>
                    <button
                      type="button"
                      className={`${styles.checkbox} ${item.checked ? styles.checkboxChecked : ""}`}
                      onClick={() => toggleChecked(item.id)}
                      aria-label={`Выбрать ${item.title}`}
                    >
                      {item.checked ? "✓" : ""}
                    </button>
                    <span className={styles.qcValue}>
                      {item.qualityControl ? "КК" : ""}
                    </span>
                    <span className={styles.codeValue}>{item.code}</span>
                  </div>

                  <div className={styles.secondCol}>{item.title}</div>

                  <div className={styles.thirdCol}>
                    <button
                      type="button"
                      className={styles.infoButton}
                      onClick={() => openInfo(item)}
                      aria-label={`Информация о назначении ${item.title}`}
                    >
                      i
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.commentCol}
                    onClick={() =>
                      setCommentTarget({ id: item.id, value: item.comment })
                    }
                  >
                    {item.comment || "Комментарий..."}
                  </button>
                </article>
              ))}
            </div>
          ))}
          {visibleSections.length === 0 ? (
            <div className={styles.emptyState}>
              В этом разделе пока нет назначений
            </div>
          ) : null}
        </div>
      </div>

      {infoTarget && (
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
                  <hr className={styles.infoDivider} />
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
      )}

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
              className={styles.commentInput}
              value={commentTarget.value}
              onChange={(event) =>
                setCommentTarget((prev) =>
                  prev ? { ...prev, value: event.target.value } : null,
                )
              }
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
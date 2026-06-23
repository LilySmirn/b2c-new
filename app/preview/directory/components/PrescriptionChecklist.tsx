"use client";

import { useEffect, useState } from "react";
import styles from "./PrescriptionChecklist.module.css";

export type ChecklistItem = {
  id: string;
  checked: boolean;
  qualityControl: boolean;
  code: string;
  title: string;
  info: string;
  comment: string;
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
};

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
};

export default function PrescriptionChecklist({
  onSelectionChange,
  uncheckItemId,
  onUncheckHandled,
  clearSelectionSignal = 0,
  initialSections = [],
}: PrescriptionChecklistProps) {
  const [sections, setSections] = useState(initialSections);
  const checklistCategories = sections.length > 0
    ? Array.from(new Map(sections.map((section) => [
        section.categoryId,
        { id: section.categoryId, label: section.categoryTitle ?? section.groupTitle },
      ])).values())
    : defaultChecklistCategories;
  const [activeCategoryId, setActiveCategoryId] = useState(checklistCategories[0]?.id ?? defaultChecklistCategories[0].id);
  const [infoText, setInfoText] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const toggleChecked = (id: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item,
        ),
      })),
    );
  };

  useEffect(() => {
    setSections(initialSections);
    setActiveCategoryId(initialSections[0]?.categoryId ?? defaultChecklistCategories[0].id);
  }, [initialSections]);

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
          item.id === commentTarget.id
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
          })),
      ),
    );
  }, [onSelectionChange, sections]);

  useEffect(() => {
    if (!uncheckItemId) return;

    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        items: section.items.map((item) =>
          item.id === uncheckItemId ? { ...item, checked: false } : item,
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
      <div className={styles.categoryTabs} role="tablist" aria-label="Раздел назначений">
        {checklistCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={activeCategoryId === category.id}
            className={`${styles.categoryTab} ${
              activeCategoryId === category.id ? styles.categoryTabActive : ""
            }`}
            onClick={() => setActiveCategoryId(category.id)}
          >
            {category.label}
          </button>
        ))}
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
                  activeCategoryId === "required-diagnostics" && section.id !== "lab"
                    ? styles.sectionRowWithoutCheckbox
                    : ""
                }`}
              >
                {section.id === "lab" ? (
                  <button
                    type="button"
                    className={`${styles.checkbox} ${
                      allRequiredDiagnosticsChecked ? styles.checkboxChecked : ""
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
                      onClick={() => setInfoText(item.info)}
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
            <div className={styles.emptyState}>В этом разделе пока нет назначений</div>
          ) : null}
        </div>
      </div>

      {infoText && (
        <div className={styles.modalOverlay} onClick={() => setInfoText(null)}>
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Информация о назначении</h3>
            <p>{infoText}</p>
            <button
              type="button"
              className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              onClick={() => setInfoText(null)}
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
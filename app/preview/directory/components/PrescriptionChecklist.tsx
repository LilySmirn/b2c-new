"use client";

import { useEffect, useState } from "react";
import styles from "./PrescriptionChecklist.module.css";

type ChecklistItem = {
  id: string;
  checked: boolean;
  qualityControl: boolean;
  code: string;
  title: string;
  info: string;
  comment: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  categoryId: string;
  groupTitle: string;
  items: ChecklistItem[];
};

export type SelectedPrescription = {
  id: string;
  groupTitle: string;
  sectionTitle: string;
  title: string;
};

const baseItems: ChecklistItem[] = [
  {
    id: "1",
    checked: true,
    qualityControl: true,
    code: "A1",
    title: "Общий (клинический) анализ крови",
    info: "Подробная информация о назначении: общий анализ крови.",
    comment: "",
  },
  {
    id: "2",
    checked: false,
    qualityControl: true,
    code: "B2",
    title: "Исследование кала на скрытую кровь",
    info: "Подробная информация о назначении: исследование кала на скрытую кровь.",
    comment: "",
  },
  {
    id: "3",
    checked: false,
    qualityControl: true,
    code: "C5",
    title: "13С-уреазный дыхательный тест на Helicobacter Pylori",
    info: "Подробная информация о назначении: 13С-уреазный дыхательный тест.",
    comment: "Комментарий врача",
  },
  {
    id: "4",
    checked: true,
    qualityControl: true,
    code: "A1",
    title: "Быстрый уреазный тест при проведении ЭГДС",
    info: "Подробная информация о назначении: быстрый уреазный тест при ЭГДС.",
    comment: "",
  },
];

const checklistCategories = [
  { id: "required-diagnostics", label: "Диагностика обязательная" },
  { id: "indicated-diagnostics", label: "Диагностика по показаниям" },
  { id: "treatment", label: "Лечение" },
  { id: "medications", label: "Препараты" },
  { id: "scales", label: "Шкалы и опросники" },
  { id: "lifestyle", label: "Образ жизни" },
  { id: "appendix-a3", label: "Приложение А3" },
];

const indicatedDiagnosticItems: ChecklistItem[] = [
  {
    id: "ultrasound",
    checked: false,
    qualityControl: true,
    code: "A04",
    title: "Ультразвуковое исследование органов брюшной полости",
    info: "Назначается при наличии клинических показаний.",
    comment: "При болевом синдроме",
  },
  {
    id: "biochemistry",
    checked: true,
    qualityControl: true,
    code: "B03",
    title: "Биохимический анализ крови расширенный",
    info: "Дополнительное лабораторное исследование по показаниям.",
    comment: "",
  },
  {
    id: "consultation",
    checked: false,
    qualityControl: false,
    code: "B01",
    title: "Консультация врача-гастроэнтеролога",
    info: "Консультация профильного специалиста по показаниям.",
    comment: "При сохранении симптомов",
  },
];

const initialSections: ChecklistSection[] = [
  {
    id: "lab",
    categoryId: "required-diagnostics",
    title: "Лабораторные исследования",
    groupTitle: "Диагностика",
    items: baseItems.map((item) => ({ ...item, id: `lab-${item.id}` })),
  },
  {
    id: "instrumental",
    categoryId: "required-diagnostics",
    title: "Инструментальные исследования",
    groupTitle: "Диагностика",
    items: baseItems.map((item) => ({ ...item, id: `inst-${item.id}` })),
  },
  {
    id: "indicated-lab",
    categoryId: "indicated-diagnostics",
    title: "Дополнительные исследования",
    groupTitle: "Диагностика по показаниям",
    items: indicatedDiagnosticItems.map((item) => ({
      ...item,
      id: `indicated-${item.id}`,
    })),
  },
];

type PrescriptionChecklistProps = {
  onSelectionChange?: (items: SelectedPrescription[]) => void;
  uncheckItemId?: string | null;
  onUncheckHandled?: () => void;
  clearSelectionSignal?: number;
};

export default function PrescriptionChecklist({
  onSelectionChange,
  uncheckItemId,
  onUncheckHandled,
  clearSelectionSignal = 0,
}: PrescriptionChecklistProps) {
  const [sections, setSections] = useState(initialSections);
  const [activeCategoryId, setActiveCategoryId] = useState(checklistCategories[0].id);
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
            <button type="button" onClick={() => setInfoText(null)}>
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
            <h3>Комментарий врача</h3>
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
              <button type="button" onClick={() => setCommentTarget(null)}>
                Отмена
              </button>
              <button type="button" onClick={saveComment}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
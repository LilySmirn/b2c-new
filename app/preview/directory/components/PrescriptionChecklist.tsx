"use client";

import { useState } from "react";
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
  items: ChecklistItem[];
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

const initialSections: ChecklistSection[] = [
  {
    id: "lab",
    title: "Лабораторные исследования",
    items: baseItems.map((item) => ({ ...item, id: `lab-${item.id}` })),
  },
  {
    id: "instrumental",
    title: "Инструментальные исследования",
    items: baseItems.map((item) => ({ ...item, id: `inst-${item.id}` })),
  },
];

export default function PrescriptionChecklist() {
  const [sections, setSections] = useState(initialSections);
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

  return (
    <div className={styles.checklistWrapper}>
      <div className={styles.checklistScroll}>
        <div className={styles.tableArea}>
          {sections.map((section) => (
            <div key={section.id} className={styles.sectionBlock}>
              <div className={styles.sectionRow}>{section.title}</div>

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
                    <span className={styles.qcValue}>{item.qualityControl ? "КК" : ""}</span>
                    <span className={styles.codeValue}>{item.code}</span>
                  </div>

                  <div className={styles.verticalDivider} />
                  <div className={styles.secondCol}>{item.title}</div>
                  <div className={styles.verticalDivider} />

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

                  <div className={styles.verticalDivider} />

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
        </div>
      </div>

      {infoText && (
        <div className={styles.modalOverlay} onClick={() => setInfoText(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
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
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
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
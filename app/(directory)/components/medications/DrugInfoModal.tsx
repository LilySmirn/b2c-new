"use client";

import { useEffect, useId, useState } from "react";
import type { MedicationField } from "./DrugRow";
import type { MedsCatalogFieldOptions } from "./medsCatalogTypes";
import styles from "./DrugInfoModal.module.css";

export type MedicationIntake = {
  morning: boolean;
  day: boolean;
  evening: boolean;
  night: boolean;
  relation: "" | "before" | "with" | "after";
};

export const EMPTY_MEDICATION_INTAKE: MedicationIntake = {
  morning: false,
  day: false,
  evening: false,
  night: false,
  relation: "",
};

const INTAKE_OPTIONS = [
  { id: "morning", label: "Утро" },
  { id: "day", label: "День" },
  { id: "evening", label: "Вечер" },
  { id: "night", label: "Ночь" },
] as const;

const RELATION_OPTIONS = [
  { id: "", label: "Не важно" },
  { id: "before", label: "До еды" },
  { id: "with", label: "Во время еды" },
  { id: "after", label: "После еды" },
] as const;

const COURSE_PRESETS = ["3 дня", "5 дней", "7 дней", "10 дней", "14 дней"];

const TIME_LABELS: Record<(typeof INTAKE_OPTIONS)[number]["id"], string> = {
  morning: "утром",
  day: "днём",
  evening: "вечером",
  night: "ночью",
};

const RELATION_LABELS: Record<Exclude<MedicationIntake["relation"], "">, string> = {
  before: "до еды",
  with: "во время еды",
  after: "после еды",
};

const MISSING_USUAL_TEXT =
  "В клинической рекомендации нет данных о схеме и продолжительности курса.";

const CAUTION_TEXT =
  "Информация о межлекарственных взаимодействиях будет доступна после подключения проверки совместимости препаратов.";

const assignmentParts = (parts: Array<string | undefined>) =>
  parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0 && part !== "undefined" && part !== "null");

export const formatIntake = (intake: MedicationIntake) => {
  const times = INTAKE_OPTIONS.filter((option) => intake[option.id]).map(
    (option) => TIME_LABELS[option.id],
  );
  const relation = intake.relation ? RELATION_LABELS[intake.relation] : "";

  return assignmentParts([...times, relation]).join(", ");
};

export const buildAssignmentPreview = (parts: {
  title: string;
  dose?: string;
  form?: string;
  intake?: string;
  scheme?: string;
  course?: string;
}) => assignmentParts([parts.title, parts.dose, parts.form, parts.intake, parts.scheme, parts.course]).join(" · ");

type DrugInfoModalProps = {
  title: string;
  qualityControl: boolean;
  recommendationLevel: string;
  checked: boolean;
  dose: string;
  form: string;
  scheme: string;
  course: string;
  comment: string;
  intake: MedicationIntake;
  description: string;
  originalScheme: string;
  originalCourse: string;
  /** Варианты из будущего `standard_dose` / `standard_form`. Пока список пуст. */
  catalogOptions?: MedsCatalogFieldOptions;
  onClose: () => void;
  onToggleCart: () => void;
  onChangeField: (field: MedicationField, value: string) => void;
  onCommentChange: (value: string) => void;
  onIntakeChange: (intake: MedicationIntake) => void;
  onReset: () => void;
  onApplyOriginal: () => void;
};

const visibleOptions = (values: readonly string[] | undefined) =>
  Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)),
  );

function CatalogComboField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasList = options.length > 0;
  const listId = useId();

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={`${styles.combo} ${hasList ? styles.comboHasList : ""}`}>
        <input
          type="text"
          className={styles.control}
          value={value}
          placeholder={label}
          aria-label={label}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
        {hasList ? (
          <button
            type="button"
            className={styles.comboToggle}
            aria-label={`Варианты: ${label}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((current) => !current)}
          >
            ▾
          </button>
        ) : null}
        {hasList && open ? (
          <div id={listId} className={styles.comboList} role="listbox">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={`${styles.comboOption} ${
                  option === value ? styles.comboOptionCurrent : ""
                }`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DrugInfoModal({
  title,
  qualityControl,
  recommendationLevel,
  checked,
  dose,
  form,
  scheme,
  course,
  comment,
  intake,
  description,
  originalScheme,
  originalCourse,
  catalogOptions,
  onClose,
  onToggleCart,
  onChangeField,
  onCommentChange,
  onIntakeChange,
  onReset,
  onApplyOriginal,
}: DrugInfoModalProps) {
  const titleId = useId();
  const sourceScheme = originalScheme.trim();
  const sourceCourse = originalCourse.trim();
  const hasOriginalRecommendation = Boolean(sourceScheme || sourceCourse);
  const doseOptions = visibleOptions(catalogOptions?.doses);
  const formOptions = visibleOptions(catalogOptions?.forms);
  const intakeLabel = formatIntake(intake);
  const preview =
    buildAssignmentPreview({
      title,
      dose,
      form,
      intake: intakeLabel,
      scheme,
      course,
    }) || "Заполните назначение";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleIntake = (id: (typeof INTAKE_OPTIONS)[number]["id"]) => {
    onIntakeChange({ ...intake, [id]: !intake[id] });
  };

  return (
    <div className={styles.layer}>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headMain}>
            <div>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              {sourceScheme || sourceCourse ? (
                <p className={styles.subtitle}>
                  {assignmentParts([sourceScheme, sourceCourse]).join(" · ")}
                </p>
              ) : null}
            </div>
            <div className={styles.badges}>
              {qualityControl ? <span className={styles.badge}>КК</span> : null}
              {recommendationLevel.trim() ? (
                <span className={styles.badge}>{recommendationLevel.trim()}</span>
              ) : null}
              <span className={styles.badge}>Лекарственный препарат</span>
            </div>
            <p className={styles.status}>{preview}</p>
          </div>
          <div className={styles.headActions}>
            <button
              type="button"
              className={`${styles.cart} ${checked ? styles.cartOn : ""}`}
              aria-pressed={checked}
              onClick={onToggleCart}
            >
              <span className={styles.cartBox} aria-hidden="true">
                {checked ? "✓" : ""}
              </span>
              <span>В корзину</span>
            </button>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        <div className={styles.layout}>
          <section className={styles.assign} aria-label="Назначение">
            <h3 className={styles.colTitle}>Назначение</h3>
            <div className={styles.fields}>
              <CatalogComboField
                label="Доза"
                value={dose}
                options={doseOptions}
                onChange={(value) => onChangeField("dose", value)}
              />
              <CatalogComboField
                label="Форма"
                value={form}
                options={formOptions}
                onChange={(value) => onChangeField("form", value)}
              />

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Приём</span>
                <div className={styles.checks}>
                  {INTAKE_OPTIONS.map((option) => (
                    <label key={option.id} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={intake[option.id]}
                        onChange={() => toggleIntake(option.id)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                <div className={styles.rels}>
                  {RELATION_OPTIONS.map((option) => (
                    <button
                      key={option.id || "any"}
                      type="button"
                      className={`${styles.rel} ${
                        intake.relation === option.id ? styles.relActive : ""
                      }`}
                      aria-pressed={intake.relation === option.id}
                      onClick={() =>
                        onIntakeChange({ ...intake, relation: option.id })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Схема</span>
                <input
                  type="text"
                  className={styles.control}
                  value={scheme}
                  placeholder="Схема"
                  aria-label="Схема"
                  autoComplete="off"
                  onChange={(event) => onChangeField("scheme", event.target.value)}
                />
              </label>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Курс</span>
                <div className={styles.rels}>
                  {COURSE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`${styles.rel} ${
                        course.trim() === preset ? styles.relActive : ""
                      }`}
                      aria-pressed={course.trim() === preset}
                      onClick={() => onChangeField("course", preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className={styles.control}
                  value={course}
                  placeholder="Свой курс"
                  aria-label="Курс"
                  autoComplete="off"
                  onChange={(event) => onChangeField("course", event.target.value)}
                />
              </div>

              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>Комментарий</span>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  value={comment}
                  placeholder="Комментарий к назначению..."
                  aria-label="Комментарий"
                  onChange={(event) => onCommentChange(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.preview}>
              <span className={styles.previewLabel}>Для пациента / корзины</span>
              <strong className={styles.previewText}>{preview}</strong>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={onReset}>
                Сбросить
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
                Готово
              </button>
            </div>
          </section>

          <section className={styles.ref} aria-label="Справка">
            <h3 className={styles.colTitle}>Справка</h3>
            <div className={styles.block}>
              <h4>Суть</h4>
              <p>{description.trim() || "Описание отсутствует"}</p>
            </div>
            <div className={styles.block}>
              <h4>Как обычно дают</h4>
              {hasOriginalRecommendation ? (
                <>
                  {sourceScheme ? <p>{sourceScheme}</p> : null}
                  {sourceCourse ? <p className={styles.muted}>Курс: {sourceCourse}</p> : null}
                </>
              ) : (
                <p>{MISSING_USUAL_TEXT}</p>
              )}
              <button
                type="button"
                className={styles.btn}
                disabled={!hasOriginalRecommendation}
                onClick={onApplyOriginal}
              >
                Подставить в назначение
              </button>
            </div>
            <div className={styles.block}>
              <h4>Осторожно</h4>
              <p>{CAUTION_TEXT}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

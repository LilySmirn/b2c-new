"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CatalogPopover, { CatalogOption } from "./CatalogPopover";
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

const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

/** Каталог хранит МНН прописными. В шапке показываем обычный регистр, исходные данные не меняются. */
const formatCatalogName = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const letters = trimmed.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, "");
  if (!letters) return trimmed;

  const isUpper =
    letters === letters.toLocaleUpperCase("ru-RU") &&
    letters !== letters.toLocaleLowerCase("ru-RU");

  if (!isUpper) return trimmed;

  return (
    trimmed.charAt(0).toLocaleUpperCase("ru-RU") + trimmed.slice(1).toLocaleLowerCase("ru-RU")
  );
};

const medicationHeading = (assignmentTitle: string, trade: string, inn: string) => {
  const tradeName = trade.trim();
  const substance = inn.trim();
  const fallback = assignmentTitle.trim();
  const primary = tradeName || (substance ? formatCatalogName(substance) : fallback);
  const secondary =
    tradeName && substance && normalizeName(substance) !== normalizeName(tradeName)
      ? formatCatalogName(substance)
      : "";

  return { primary, secondary };
};

export const formatIntake = (intake: MedicationIntake) => {
  const times = INTAKE_OPTIONS.filter((option) => intake[option.id]).map(
    (option) => TIME_LABELS[option.id],
  );
  const relation = intake.relation ? RELATION_LABELS[intake.relation] : "";

  return assignmentParts([...times, relation]).join(", ");
};

export const buildAssignmentPreview = (parts: {
  title: string;
  selection?: string;
  dose?: string;
  form?: string;
  intake?: string;
  scheme?: string;
  course?: string;
}) =>
  assignmentParts([
    parts.title,
    parts.selection,
    parts.dose,
    parts.form,
    parts.intake,
    parts.scheme,
    parts.course,
  ]).join(" · ");

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
  /** Раздел «Комментарий» клинической рекомендации. Не поле «Комментарий» назначения. */
  infoComment?: string;
  originalScheme: string;
  originalCourse: string;
  /** Выбранное торговое наименование (`name_trade`). */
  tradeName?: string;
  /** Выбранное МНН (`standard_MNN`). */
  innName?: string;
  /** Варианты `standard_dose` / `standard_form` для текущего МНН и торгового наименования. */
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
  const anchorRef = useRef<HTMLDivElement>(null);
  const hasList = options.length > 0;

  useEffect(() => {
    if (!hasList) setOpen(false);
  }, [hasList]);

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div
        ref={anchorRef}
        className={`${styles.combo} ${hasList ? styles.comboHasList : ""}`}
      >
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
            onClick={() => setOpen((current) => !current)}
          >
            ▾
          </button>
        ) : null}
        {hasList ? (
          <CatalogPopover
            open={open}
            anchorRef={anchorRef}
            label={label}
            onClose={() => setOpen(false)}
          >
            {options.map((option) => (
              <CatalogOption
                key={option}
                selected={option === value}
                onSelect={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </CatalogOption>
            ))}
          </CatalogPopover>
        ) : null}
      </div>
    </div>
  );
}

function KrCommentDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((node) => !node.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.krLayer}>
      <div className={styles.krBackdrop} onClick={onClose} />
      <div
        ref={dialogRef}
        className={styles.krDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.krHead}>
          <h2 id={titleId} className={styles.krTitle}>
            Полный комментарий из КР
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Закрыть комментарий из КР"
          >
            ×
          </button>
        </div>
        <div className={styles.krBody}>{text}</div>
      </div>
    </div>,
    document.body,
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
  infoComment = "",
  originalScheme,
  originalCourse,
  tradeName = "",
  innName = "",
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
  const krTriggerRef = useRef<HTMLButtonElement>(null);
  const krWasOpen = useRef(false);
  const [krOpen, setKrOpen] = useState(false);
  const krOpenRef = useRef(false);
  const sourceScheme = originalScheme.trim();
  const sourceCourse = originalCourse.trim();
  const hasOriginalRecommendation = Boolean(sourceScheme || sourceCourse);
  const doseOptions = visibleOptions(catalogOptions?.doses);
  const formOptions = visibleOptions(catalogOptions?.forms);
  const heading = medicationHeading(title, tradeName, innName);
  const recommendation = recommendationLevel.trim();
  const krText = infoComment.trim();
  const intakeLabel = formatIntake(intake);
  const patientSummary = buildAssignmentPreview({
    title: heading.primary,
    selection: heading.secondary,
    dose,
    form,
    intake: intakeLabel,
    scheme,
    course,
  });
  const hasPatientNote = comment.trim().length > 0;
  krOpenRef.current = krOpen && Boolean(krText);

  useEffect(() => {
    if (!krText) setKrOpen(false);
  }, [krText]);

  useEffect(() => {
    if (krOpen) {
      krWasOpen.current = true;
      return;
    }

    if (!krWasOpen.current) return;

    krWasOpen.current = false;
    krTriggerRef.current?.focus();
  }, [krOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || krOpenRef.current) return;

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleIntake = (id: (typeof INTAKE_OPTIONS)[number]["id"]) => {
    onIntakeChange({ ...intake, [id]: !intake[id] });
  };

  const closeKrComment = useCallback(() => setKrOpen(false), []);

  return (
    <div className={styles.layer}>
      <div className={styles.backdrop} onClick={krOpen ? undefined : onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal={krOpen ? undefined : true}
        aria-labelledby={titleId}
        inert={krOpen ? true : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <div className={styles.headMain}>
            <h2 id={titleId} className={styles.title}>
              {heading.primary}
            </h2>
            {heading.secondary ? <p className={styles.subtitle}>{heading.secondary}</p> : null}
            {qualityControl || recommendation ? (
              <div className={styles.badges}>
                {qualityControl ? <span className={styles.badge}>КК</span> : null}
                {recommendation ? <span className={styles.badge}>{recommendation}</span> : null}
              </div>
            ) : null}
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
              <span>{checked ? "В назначении" : "Добавить в назначение"}</span>
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
          <div className={styles.assignTop}>
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
            </div>
          </div>

          <div className={styles.guideSlot}>
            <div className={`${styles.block} ${styles.guide}`}>
              <div className={styles.cardHead}>
                <h4>Справка</h4>
                {krText ? (
                  <button
                    ref={krTriggerRef}
                    type="button"
                    className={styles.cardAction}
                    onClick={() => setKrOpen(true)}
                  >
                    Полный комментарий из КР
                  </button>
                ) : null}
              </div>
              <div className={styles.guideBody}>
                <p>{description.trim() || "Описание отсутствует"}</p>
              </div>
            </div>
          </div>

          <div className={styles.assignRest}>
            <div className={styles.fields}>
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
              <span className={styles.previewLabel}>Комментарий для пациента</span>
              {patientSummary || hasPatientNote ? (
                <div className={styles.previewText}>
                  {patientSummary ? <p>{patientSummary}</p> : null}
                  {hasPatientNote ? <p className={styles.previewNote}>{comment}</p> : null}
                </div>
              ) : (
                <strong className={styles.previewText}>Заполните назначение</strong>
              )}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.btn} onClick={onReset}>
                Сбросить
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
                Готово
              </button>
            </div>
          </div>

          <div className={styles.notes}>
            <div className={styles.block}>
              <div className={styles.cardHead}>
                <h4>Как обычно дают</h4>
                <button
                  type="button"
                  className={styles.cardAction}
                  disabled={!hasOriginalRecommendation}
                  onClick={onApplyOriginal}
                >
                  Подставить в назначение
                </button>
              </div>
              {hasOriginalRecommendation ? (
                <>
                  {sourceScheme ? <p>{sourceScheme}</p> : null}
                  {sourceCourse ? <p className={styles.muted}>Курс: {sourceCourse}</p> : null}
                </>
              ) : (
                <p>{MISSING_USUAL_TEXT}</p>
              )}
            </div>
            <div className={styles.block}>
              <h4>Осторожно</h4>
              <p>{CAUTION_TEXT}</p>
            </div>
          </div>
        </div>
      </div>
      {krOpen && krText ? <KrCommentDialog text={krText} onClose={closeKrComment} /> : null}
    </div>
  );
}

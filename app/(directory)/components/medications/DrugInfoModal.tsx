"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  buildPatientComment,
  hasCustomAssignment,
  medicationHeading,
  removeSchemeChip,
  schemeChips,
  schemeInputPlaceholder,
  tableScheduleValue,
  type CombinationAssignmentView,
  type MedicationIntake,
  type SchemeChipId,
} from "./assignmentScheme";
import CatalogPopover, { CatalogOption } from "./CatalogPopover";
import type { MedicationField } from "./DrugRow";
import type { MedsCatalogFieldOptions } from "./medsCatalogTypes";
import styles from "./DrugInfoModal.module.css";

export type { MedicationIntake } from "./assignmentScheme";
export { EMPTY_MEDICATION_INTAKE, formatIntake, buildAssignmentPreview } from "./assignmentScheme";

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

const MISSING_USUAL_TEXT =
  "В клинической рекомендации нет данных о схеме и продолжительности курса.";

const USUAL_SECTION_TITLE = "Как указано в КР";

const CAUTION_TEXT =
  "Информация о межлекарственных взаимодействиях будет доступна после подключения проверки совместимости препаратов.";

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
  /** Собственный текст комментария врача, а не автоматически скопированная схема КР. */
  noteCustom?: boolean;
  /** Заполненный вид многокомпонентной схемы. Для остальных типов не передаётся. */
  combination?: CombinationAssignmentView | null;
  /** Не закрывать попап, пока поверх открыт мастер схемы. */
  dismissLocked?: boolean;
  onOpenScheme?: () => void;
  onClose: () => void;
  onToggleCart: () => void;
  onChangeField: (field: MedicationField, value: string) => void;
  onCommentChange: (value: string) => void;
  onIntakeChange: (intake: MedicationIntake) => void;
  onReset: () => void;
  onApplyOriginal: () => void;
};

/** Полоса нужна, только если текст справки выше нижнего края поля «Схема». */
const guideNeedsScroll = (
  section: HTMLElement,
  body: HTMLElement,
  schemeField: HTMLElement,
) => {
  const frame = body.parentElement;
  const heading = section.querySelector<HTMLElement>("[data-reference-heading]");
  if (!frame || !heading) return false;

  const sectionStyle = getComputedStyle(section);
  const frameStyle = getComputedStyle(frame);
  const gap = Number.parseFloat(sectionStyle.rowGap || sectionStyle.gap || "0") || 0;
  const frameChrome =
    Number.parseFloat(frameStyle.paddingTop) +
    Number.parseFloat(frameStyle.paddingBottom) +
    Number.parseFloat(frameStyle.borderTopWidth) +
    Number.parseFloat(frameStyle.borderBottomWidth);
  const sectionChrome =
    Number.parseFloat(sectionStyle.paddingTop) +
    Number.parseFloat(sectionStyle.paddingBottom) +
    Number.parseFloat(sectionStyle.borderTopWidth) +
    Number.parseFloat(sectionStyle.borderBottomWidth);

  // Ширина без полосы: иначе scrollbar уменьшает строку и создаёт ложное переполнение.
  const previous = body.style.overflowY;
  body.style.overflowY = "hidden";
  const naturalBody = body.scrollHeight;
  body.style.overflowY = previous;

  const sectionTop = section.getBoundingClientRect().top;
  const schemeBottom = schemeField.getBoundingClientRect().bottom;
  // На узком экране колонки стоят друг под другом, и край «Схемы» выше справки.
  if (schemeBottom <= sectionTop + 1) {
    const maxHeight = getComputedStyle(body).maxHeight;
    if (!maxHeight.endsWith("px")) return false;
    const parsed = Number.parseFloat(maxHeight);
    return Number.isFinite(parsed) && parsed > 0 && naturalBody - parsed > 1;
  }

  const natural =
    sectionChrome + heading.getBoundingClientRect().height + gap + frameChrome + naturalBody;
  const limit = schemeBottom - sectionTop;
  if (!Number.isFinite(natural) || !Number.isFinite(limit) || limit <= 0) return false;

  return natural - limit > 1;
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
  noteCustom = false,
  combination = null,
  dismissLocked = false,
  onOpenScheme,
  onClose,
  onToggleCart,
  onChangeField,
  onCommentChange,
  onIntakeChange,
  onReset,
  onApplyOriginal,
}: DrugInfoModalProps) {
  const titleId = useId();
  const layoutRef = useRef<HTMLDivElement>(null);
  const schemeFieldRef = useRef<HTMLDivElement>(null);
  const guideSectionRef = useRef<HTMLElement>(null);
  const guideBodyRef = useRef<HTMLDivElement>(null);
  const [guideOverflow, setGuideOverflow] = useState(false);
  const krTriggerRef = useRef<HTMLButtonElement>(null);
  const krWasOpen = useRef(false);
  const [krOpen, setKrOpen] = useState(false);
  const krOpenRef = useRef(false);
  const sourceScheme = originalScheme.trim();
  const sourceCourse = originalCourse.trim();
  const hasOriginalRecommendation = Boolean(sourceScheme || sourceCourse);
  const doseOptions = visibleOptions(catalogOptions?.doses);
  const formOptions = visibleOptions(catalogOptions?.forms);
  const heading = combination
    ? { primary: combination.primary, secondary: combination.secondary }
    : medicationHeading(title, tradeName, innName);
  const recommendation = recommendationLevel.trim();
  const krText = infoComment.trim();
  const chips = schemeChips({ dose, form, intake });
  const customAssignment = hasCustomAssignment({
    dose,
    form,
    schemeText: scheme,
    courseText: course,
    intake,
  });
  const schemeValue = tableScheduleValue(scheme, sourceScheme, customAssignment);
  const courseValue = tableScheduleValue(course, sourceCourse, customAssignment);
  const patient = buildPatientComment({
    title,
    tradeName,
    innName,
    dose,
    form,
    schemeText: scheme,
    courseText: course,
    intake,
    originalScheme,
    originalCourse,
    note: comment,
    noteCustom,
    combination,
  });
  krOpenRef.current = krOpen && Boolean(krText);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const schemeField = schemeFieldRef.current;
    const section = guideSectionRef.current;
    const body = guideBodyRef.current;
    if (!layout || !schemeField || !section || !body) return;

    const measure = () => {
      const needsScroll = guideNeedsScroll(section, body, schemeField);
      setGuideOverflow((current) => (current === needsScroll ? current : needsScroll));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layout);
    observer.observe(schemeField);
    observer.observe(body);
    return () => observer.disconnect();
  }, [description]);

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
      if (event.key !== "Escape" || event.defaultPrevented || krOpenRef.current || dismissLocked) return;

      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismissLocked, onClose]);

  const toggleIntake = (id: (typeof INTAKE_OPTIONS)[number]["id"]) => {
    onIntakeChange({ ...intake, [id]: !intake[id] });
  };

  const removeChip = (id: SchemeChipId) => {
    const next = removeSchemeChip(
      { dose, form, schemeText: scheme, courseText: course, intake },
      id,
    );

    if (next.dose !== dose) onChangeField("dose", next.dose);
    if (next.form !== form) onChangeField("form", next.form);
    if (next.intake !== intake) onIntakeChange(next.intake);
  };

  const closeKrComment = useCallback(() => setKrOpen(false), []);

  return (
    <div className={styles.layer}>
      <div className={styles.backdrop} onClick={krOpen || dismissLocked ? undefined : onClose} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal={krOpen || dismissLocked ? undefined : true}
        aria-labelledby={titleId}
        inert={krOpen || dismissLocked ? true : undefined}
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

        <div className={styles.body}>
          {combination ? (
            <section className={styles.composition} aria-label="Состав схемы">
              <h4>Состав схемы</h4>
              <div
                className={styles.slots}
                data-count={combination.rows.length}
                style={
                  {
                    "--components-count": Math.max(combination.rows.length, 1),
                  } as CSSProperties
                }
              >
                {combination.rows.map((row) => (
                  <div
                    key={`${row.index}-${row.name}`}
                    className={`${styles.slot} ${row.chosen ? styles.slotChosen : ""}`}
                  >
                    <span className={styles.slotIndex}>{row.index}</span>
                    <div className={styles.slotText}>
                      <strong>{row.name}</strong>
                      <small>{row.selectedLabel}</small>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.compositionButton}`}
                onClick={onOpenScheme}
              >
                Открыть мастер схемы
              </button>
            </section>
          ) : null}

          <div ref={layoutRef} className={styles.layout}>
            <div className={styles.assign}>
              <div className={styles.doseRow}>
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
              </div>

              <div className={styles.field}>
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

                <div ref={schemeFieldRef} className={styles.field}>
                  <span className={styles.fieldLabel} id={`${titleId}-scheme`}>
                    Схема
                  </span>
                  <div className={styles.schemeBox} role="group" aria-labelledby={`${titleId}-scheme`}>
                    {chips.map((chip) => (
                      <span key={chip.id} className={styles.chip}>
                        <span className={styles.chipLabel}>{chip.label}</span>
                        <button
                          type="button"
                          className={styles.chipRemove}
                          aria-label={`Убрать ${chip.label}`}
                          onClick={() => removeChip(chip.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      className={styles.schemeInput}
                      value={schemeValue}
                      placeholder={schemeInputPlaceholder(chips.length)}
                      aria-label="Схема"
                      autoComplete="off"
                      onChange={(event) => onChangeField("scheme", event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Курс</span>
                  <div className={styles.rels}>
                    {COURSE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`${styles.rel} ${
                          courseValue.trim() === preset ? styles.relActive : ""
                        }`}
                        aria-pressed={courseValue.trim() === preset}
                        onClick={() => onChangeField("course", preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className={styles.control}
                    value={courseValue}
                    placeholder="Свой курс"
                    aria-label="Курс"
                    autoComplete="off"
                    onChange={(event) => onChangeField("course", event.target.value)}
                  />
                </div>

                <label className={styles.field}>
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

              <div className={styles.previewSlot}>
                <div className={styles.preview}>
                  <span className={styles.previewLabel}>Комментарий для пациента</span>
                  {patient.summary || patient.note ? (
                    <div className={styles.previewText}>
                      {patient.summary ? <p>{patient.summary}</p> : null}
                      {patient.note ? <p className={styles.previewNote}>{patient.note}</p> : null}
                    </div>
                  ) : (
                    <strong className={styles.previewText}>Заполните назначение</strong>
                  )}
                </div>
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

            <div
              className={styles.side}
              data-guide-layout={guideOverflow ? "aligned" : "compact"}
            >
              <section
                ref={guideSectionRef}
                className={`${styles.sideSection} ${styles.guideSection}`}
                data-reference-section="guide"
                aria-label="Справка"
              >
                <div className={styles.sideHead} data-reference-heading>
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
                <div className={`${styles.block} ${styles.guideFrame}`} data-reference-frame>
                  <div
                    ref={guideBodyRef}
                    className={styles.guideBody}
                    data-overflow={guideOverflow ? "true" : undefined}
                  >
                    <p>{description.trim() || "Описание отсутствует"}</p>
                  </div>
                </div>
              </section>

              <section
                className={`${styles.sideSection} ${styles.usualSection}`}
                data-reference-section="usual"
                aria-label={USUAL_SECTION_TITLE}
              >
                <div className={styles.sideHead} data-reference-heading>
                  <h4>{USUAL_SECTION_TITLE}</h4>
                  <button
                    type="button"
                    className={styles.cardAction}
                    disabled={!hasOriginalRecommendation}
                    onClick={onApplyOriginal}
                  >
                    Подставить в назначение
                  </button>
                </div>
                <div className={styles.block} data-reference-frame>
                  {hasOriginalRecommendation ? (
                    <>
                      {sourceScheme ? <p>{sourceScheme}</p> : null}
                      {sourceCourse ? <p className={styles.muted}>Курс: {sourceCourse}</p> : null}
                    </>
                  ) : (
                    <p>{MISSING_USUAL_TEXT}</p>
                  )}
                </div>
              </section>

              <section
                className={`${styles.sideSection} ${styles.cautionSection}`}
                data-reference-section="caution"
                aria-label="Осторожно"
              >
                <div className={styles.sideHead} data-reference-heading>
                  <h4>Осторожно</h4>
                </div>
                <div className={styles.block} data-reference-frame>
                  <p>{CAUTION_TEXT}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      {krOpen && krText ? <KrCommentDialog text={krText} onClose={closeKrComment} /> : null}
    </div>
  );
}

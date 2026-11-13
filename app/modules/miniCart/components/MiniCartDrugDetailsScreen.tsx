"use client";

import {
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  buildPatientComment,
  hasCustomAssignment,
  medicationHeading,
  removeSchemeChip,
  schemeChips,
  schemeInputPlaceholder,
  tableScheduleValue,
  type MedicationIntake,
  type SchemeChipId,
} from "@/app/(directory)/components/medications/assignmentScheme";
import type { MiniCartCatalogItem, MiniCartMedsField } from "../types";
import MiniCartCatalogCombo from "./MiniCartCatalogCombo";

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

const CAUTION_TEXT =
  "Информация о межлекарственных взаимодействиях будет доступна после подключения проверки совместимости препаратов.";

type DetailsTab = "assignment" | "info";

type AccordionId = "rationale" | "usual" | "caution" | "krComment";

type MiniCartDrugDetailsScreenProps = {
  item: MiniCartCatalogItem;
  editable: boolean;
  canToggle: boolean;
  canReset: boolean;
  canApplyOriginal: boolean;
  canOpenScheme: boolean;
  schemeLocked?: boolean;
  onBack: () => void;
  onDone: () => void;
  onToggleInclude: () => void;
  onChangeField: (field: MiniCartMedsField, value: string) => void;
  onCommentChange: (value: string) => void;
  onIntakeChange: (intake: MedicationIntake) => void;
  onReset: () => void;
  onApplyOriginal: () => void;
  onOpenScheme: () => void;
};

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  action,
  children,
  warn,
}: {
  id: AccordionId;
  title: string;
  open: boolean;
  onToggle: (id: AccordionId) => void;
  action?: ReactNode;
  children: ReactNode;
  warn?: boolean;
}) {
  return (
    <section
      className={`preparaty__drug-accordion${warn ? " is-warn" : ""}`}
      data-open={open ? "1" : "0"}
    >
      <div className="preparaty__drug-accordion-head">
        <button
          type="button"
          className="preparaty__drug-accordion-toggle"
          aria-expanded={open}
          onClick={() => onToggle(id)}
        >
          <span className="preparaty__drug-accordion-chevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          <span>{title}</span>
        </button>
        {action}
      </div>
      {open ? <div className="preparaty__drug-accordion-body">{children}</div> : null}
    </section>
  );
}

export default function MiniCartDrugDetailsScreen({
  item,
  editable,
  canToggle,
  canReset,
  canApplyOriginal,
  canOpenScheme,
  schemeLocked = false,
  onBack,
  onDone,
  onToggleInclude,
  onChangeField,
  onCommentChange,
  onIntakeChange,
  onReset,
  onApplyOriginal,
  onOpenScheme,
}: MiniCartDrugDetailsScreenProps) {
  const titleId = useId();
  const [tab, setTab] = useState<DetailsTab>("assignment");
  const [openSections, setOpenSections] = useState<Partial<Record<AccordionId, boolean>>>(
    {},
  );

  const details = item.medicationDetails;
  const dose = item.selectedDose ?? "";
  const form = item.selectedForm ?? "";
  const schemeDraft = details?.schemeDraft ?? "";
  const courseDraft = details?.courseDraft ?? "";
  const originalScheme = details?.originalScheme ?? "";
  const originalCourse = details?.originalCourse ?? "";
  const intake = details?.intake ?? {
    morning: false,
    day: false,
    evening: false,
    night: false,
    relation: "",
  };
  const comment = item.commentText ?? "";
  const noteCustom = details?.noteCustom ?? false;
  const combination = details?.combination ?? null;
  const doseOptions = details?.doseOptions ?? [];
  const formOptions = details?.formOptions ?? [];
  const description = details?.description ?? item.hint ?? "";
  const infoComment = details?.infoComment ?? "";
  const tradeName = item.kind === "scheme" ? "" : item.selectedTrade ?? "";
  const innName = item.selectedInn ?? item.inn ?? "";

  const heading = combination
    ? { primary: combination.primary, secondary: combination.secondary }
    : medicationHeading(item.name, tradeName, innName);

  const customAssignment = hasCustomAssignment({
    dose,
    form,
    schemeText: schemeDraft,
    courseText: courseDraft,
    intake,
  });
  const schemeValue = tableScheduleValue(
    schemeDraft,
    originalScheme,
    customAssignment,
  );
  const courseValue = tableScheduleValue(
    courseDraft,
    originalCourse,
    customAssignment,
  );
  const chips = schemeChips({ dose, form, intake });
  const hasOriginalRecommendation = Boolean(
    originalScheme.trim() || originalCourse.trim(),
  );
  const patient = useMemo(
    () =>
      buildPatientComment({
        title: item.name,
        tradeName,
        innName,
        dose,
        form,
        schemeText: schemeDraft,
        courseText: courseDraft,
        intake,
        originalScheme,
        originalCourse,
        note: comment,
        noteCustom,
        combination,
      }),
    [
      comment,
      combination,
      courseDraft,
      dose,
      form,
      innName,
      intake,
      item.name,
      noteCustom,
      originalCourse,
      originalScheme,
      schemeDraft,
      tradeName,
    ],
  );

  const toggleSection = (id: AccordionId) => {
    setOpenSections((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const toggleIntake = (id: (typeof INTAKE_OPTIONS)[number]["id"]) => {
    if (!editable) return;
    onIntakeChange({ ...intake, [id]: !intake[id] });
  };

  const removeChip = (id: SchemeChipId) => {
    if (!editable) return;
    const next = removeSchemeChip(
      {
        dose,
        form,
        schemeText: schemeDraft,
        courseText: courseDraft,
        intake,
      },
      id,
    );
    if (next.dose !== dose) onChangeField("dose", next.dose);
    if (next.form !== form) onChangeField("form", next.form);
    if (next.intake !== intake) onIntakeChange(next.intake);
  };

  return (
    <div
      className="preparaty__drug-details"
      aria-labelledby={titleId}
      data-scheme-locked={schemeLocked ? "1" : "0"}
    >
      <div className="preparaty__drug-details-top">
        <button
          type="button"
          className="preparaty__drug-back"
          onClick={onBack}
        >
          ‹ Назад к препаратам
        </button>

        <div className="preparaty__drug-heading">
          <div className="preparaty__drug-heading-main">
            <h2 id={titleId} className="preparaty__drug-title">
              {heading.primary}
            </h2>
            {heading.secondary ? (
              <p className="preparaty__drug-subtitle">{heading.secondary}</p>
            ) : null}
          </div>
          {item.qc || item.level ? (
            <div className="preparaty__drug-badges">
              {item.qc ? (
                <span className="preparaty__drug-badge">{item.qc}</span>
              ) : null}
              {item.level ? (
                <span className="preparaty__drug-badge">{item.level}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="preparaty__drug-tabs" role="tablist" aria-label="Разделы назначения">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "assignment"}
            className={`preparaty__drug-tab${tab === "assignment" ? " is-active" : ""}`}
            onClick={() => setTab("assignment")}
          >
            Назначение
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "info"}
            className={`preparaty__drug-tab${tab === "info" ? " is-active" : ""}`}
            onClick={() => setTab("info")}
          >
            Информация
          </button>
        </div>
      </div>

      <div className="preparaty__drug-details-scroll">
        {tab === "assignment" ? (
          <div className="preparaty__drug-assign" role="tabpanel">
            {combination ? (
              <section className="preparaty__drug-composition" aria-label="Состав схемы">
                <h3>Состав схемы</h3>
                <div
                  className="preparaty__drug-slots"
                  style={
                    {
                      "--components-count": Math.max(combination.rows.length, 1),
                    } as CSSProperties
                  }
                >
                  {combination.rows.map((row) => (
                    <div
                      key={`${row.index}-${row.name}`}
                      className={`preparaty__drug-slot${row.chosen ? " is-chosen" : ""}`}
                    >
                      <span className="preparaty__drug-slot-index">{row.index}</span>
                      <div className="preparaty__drug-slot-text">
                        <strong>{row.name}</strong>
                        <small>{row.selectedLabel}</small>
                      </div>
                    </div>
                  ))}
                </div>
                {canOpenScheme ? (
                  <button
                    type="button"
                    className="preparaty__drug-scheme-btn"
                    onClick={onOpenScheme}
                  >
                    Открыть мастер схемы
                  </button>
                ) : null}
              </section>
            ) : null}

            <MiniCartCatalogCombo
              label="Доза"
              value={dose}
              options={doseOptions}
              disabled={!editable}
              onChange={(value) => onChangeField("dose", value)}
            />
            <MiniCartCatalogCombo
              label="Форма"
              value={form}
              options={formOptions}
              disabled={!editable}
              onChange={(value) => onChangeField("form", value)}
            />

            <div className="preparaty__drug-field">
              <span className="preparaty__drug-field-label">Приём</span>
              <div className="preparaty__drug-checks">
                {INTAKE_OPTIONS.map((option) => (
                  <label key={option.id} className="preparaty__drug-check">
                    <input
                      type="checkbox"
                      checked={intake[option.id]}
                      disabled={!editable}
                      onChange={() => toggleIntake(option.id)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <div className="preparaty__drug-rels">
                {RELATION_OPTIONS.map((option) => (
                  <button
                    key={option.id || "any"}
                    type="button"
                    className={`preparaty__drug-rel${
                      intake.relation === option.id ? " is-active" : ""
                    }`}
                    aria-pressed={intake.relation === option.id}
                    disabled={!editable}
                    onClick={() =>
                      onIntakeChange({ ...intake, relation: option.id })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="preparaty__drug-field">
              <span className="preparaty__drug-field-label" id={`${titleId}-scheme`}>
                Схема
              </span>
              <div
                className="preparaty__drug-scheme-box"
                role="group"
                aria-labelledby={`${titleId}-scheme`}
              >
                {chips.map((chip) => (
                  <span key={chip.id} className="preparaty__drug-chip">
                    <span>{chip.label}</span>
                    {editable ? (
                      <button
                        type="button"
                        className="preparaty__drug-chip-remove"
                        aria-label={`Убрать ${chip.label}`}
                        onClick={() => removeChip(chip.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                ))}
                <input
                  type="text"
                  className="preparaty__drug-scheme-input"
                  value={schemeValue}
                  placeholder={schemeInputPlaceholder(chips.length)}
                  aria-label="Схема"
                  autoComplete="off"
                  disabled={!editable}
                  onChange={(event) => onChangeField("scheme", event.target.value)}
                />
              </div>
            </div>

            <div className="preparaty__drug-field">
              <span className="preparaty__drug-field-label">Курс</span>
              <div className="preparaty__drug-rels">
                {COURSE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preparaty__drug-rel${
                      courseValue.trim() === preset ? " is-active" : ""
                    }`}
                    aria-pressed={courseValue.trim() === preset}
                    disabled={!editable}
                    onClick={() => onChangeField("course", preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className="preparaty__drug-control"
                value={courseValue}
                placeholder="Свой курс"
                aria-label="Курс"
                autoComplete="off"
                disabled={!editable}
                onChange={(event) => onChangeField("course", event.target.value)}
              />
            </div>

            <label className="preparaty__drug-field">
              <span className="preparaty__drug-field-label">Комментарий</span>
              <textarea
                className="preparaty__drug-textarea"
                rows={3}
                value={comment}
                placeholder="Комментарий к назначению..."
                aria-label="Комментарий"
                disabled={!editable}
                onChange={(event) => onCommentChange(event.target.value)}
              />
            </label>

            <div className="preparaty__drug-preview">
              <span className="preparaty__drug-preview-label">
                Комментарий для пациента
              </span>
              {patient.summary || patient.note ? (
                <div className="preparaty__drug-preview-text">
                  {patient.summary ? <p>{patient.summary}</p> : null}
                  {patient.note ? (
                    <p className="preparaty__drug-preview-note">{patient.note}</p>
                  ) : null}
                </div>
              ) : (
                <strong className="preparaty__drug-preview-text">
                  Заполните назначение
                </strong>
              )}
            </div>

            <div className="preparaty__drug-assign-actions">
              {canReset ? (
                <button
                  type="button"
                  className="preparaty__drug-btn"
                  onClick={onReset}
                >
                  Сбросить
                </button>
              ) : null}
            </div>

            <label className="preparaty__drug-include">
              <input
                type="checkbox"
                checked={Boolean(item.selected)}
                disabled={!canToggle}
                onChange={onToggleInclude}
              />
              <span>Включить в назначения</span>
            </label>
          </div>
        ) : (
          <div className="preparaty__drug-info" role="tabpanel">
            <AccordionSection
              id="rationale"
              title="Справка"
              open={Boolean(openSections.rationale)}
              onToggle={toggleSection}
            >
              <p>{description.trim() || "Описание отсутствует"}</p>
            </AccordionSection>

            {infoComment.trim() ? (
              <AccordionSection
                id="krComment"
                title="Комментарий из КР"
                open={Boolean(openSections.krComment)}
                onToggle={toggleSection}
              >
                <p>{infoComment}</p>
              </AccordionSection>
            ) : null}

            <AccordionSection
              id="usual"
              title="Как указано в КР"
              open={Boolean(openSections.usual)}
              onToggle={toggleSection}
              action={
                canApplyOriginal ? (
                  <button
                    type="button"
                    className="preparaty__drug-card-action"
                    disabled={!hasOriginalRecommendation || !editable}
                    onClick={onApplyOriginal}
                  >
                    Подставить в назначение
                  </button>
                ) : null
              }
            >
              {hasOriginalRecommendation ? (
                <>
                  {originalScheme.trim() ? <p>{originalScheme.trim()}</p> : null}
                  {originalCourse.trim() ? (
                    <p className="preparaty__drug-muted">
                      Курс: {originalCourse.trim()}
                    </p>
                  ) : null}
                </>
              ) : (
                <p>{MISSING_USUAL_TEXT}</p>
              )}
            </AccordionSection>

            <AccordionSection
              id="caution"
              title="Осторожно"
              open={Boolean(openSections.caution)}
              onToggle={toggleSection}
              warn
            >
              <p>{CAUTION_TEXT}</p>
            </AccordionSection>
          </div>
        )}
      </div>

      <div className="preparaty__drug-details-foot">
        <button
          type="button"
          className="preparaty__drug-done"
          onClick={onDone}
        >
          Готово
        </button>
      </div>
    </div>
  );
}

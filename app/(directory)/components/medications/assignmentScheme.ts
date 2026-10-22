/**
 * Назначение в попапе: доза, форма, приём и текст схемы хранятся отдельно.
 * Строка «Схема» и комментарий для пациента собираются из этих полей.
 * Исходная схема КР не записывается в пользовательские поля и не считается правкой.
 */

import { isComponentChosen } from "./combinationSelection";
import type { CombinationDraft, CombinationPick } from "./combinationSelection";
import type { MedsCatalogComponent } from "./medsCatalogTypes";

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

const INTAKE_TIMES = [
  { id: "morning", chip: "Утром", comment: "утром" },
  { id: "day", chip: "Днём", comment: "днём" },
  { id: "evening", chip: "Вечером", comment: "вечером" },
  { id: "night", chip: "Ночью", comment: "ночью" },
] as const;

const RELATION_CHIPS: Record<Exclude<MedicationIntake["relation"], "">, string> = {
  before: "До еды",
  with: "Во время еды",
  after: "После еды",
};

const RELATION_COMMENTS: Record<Exclude<MedicationIntake["relation"], "">, string> = {
  before: "до еды",
  with: "во время еды",
  after: "после еды",
};

export type SchemeChipId = "dose" | "form" | "morning" | "day" | "evening" | "night" | "relation";

export type SchemeChip = {
  id: SchemeChipId;
  label: string;
};

export type AssignmentFieldState = {
  dose: string;
  form: string;
  schemeText: string;
  courseText: string;
  intake: MedicationIntake;
};

export type ScheduleDraft = Partial<
  Record<"dose" | "form" | "scheme" | "course", string>
>;

const assignmentParts = (parts: Array<string | undefined>) =>
  parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0 && part !== "undefined" && part !== "null");

const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

/** Каталог хранит МНН прописными. В шапке показываем обычный регистр, исходные данные не меняются. */
export const formatCatalogName = (value: string) => {
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

export const medicationHeading = (assignmentTitle: string, trade: string, inn: string) => {
  const tradeName = trade.trim();
  const substance = inn.trim();
  const fallback = assignmentTitle.trim();
  const primary = tradeName || (substance ? formatCatalogName(substance) : fallback);
  const secondary = tradeName && substance ? formatCatalogName(substance) : "";

  return { primary, secondary };
};

export const formatIntake = (intake: MedicationIntake) => {
  const times = INTAKE_TIMES.filter((option) => intake[option.id]).map((option) => option.comment);
  const relation = intake.relation ? RELATION_COMMENTS[intake.relation] : "";

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

export const isIntakeCustom = (intake: MedicationIntake) =>
  intake.morning || intake.day || intake.evening || intake.night || intake.relation !== "";

export const assignmentFromDraft = (
  draft: ScheduleDraft | undefined,
  intake?: MedicationIntake,
): AssignmentFieldState => ({
  dose: draft?.dose ?? "",
  form: draft?.form ?? "",
  schemeText: draft && "scheme" in draft ? (draft.scheme ?? "") : "",
  courseText: draft && "course" in draft ? (draft.course ?? "") : "",
  intake: intake ?? EMPTY_MEDICATION_INTAKE,
});

/** Есть ли собственный параметр назначения. Торговое имя и автотекст КР сюда не входят. */
export const hasCustomAssignment = (fields: AssignmentFieldState) =>
  Boolean(
    fields.dose.trim() ||
      fields.form.trim() ||
      fields.schemeText.trim() ||
      fields.courseText.trim() ||
      isIntakeCustom(fields.intake),
  );

export const tableScheduleValue = (userValue: string, originalValue: string, custom: boolean) =>
  custom ? userValue : originalValue;

export const schemeChips = (
  fields: Pick<AssignmentFieldState, "dose" | "form" | "intake">,
): SchemeChip[] => {
  const chips: SchemeChip[] = [];
  const dose = fields.dose.trim();
  const form = fields.form.trim();

  if (dose) chips.push({ id: "dose", label: dose });
  if (form) chips.push({ id: "form", label: form });

  INTAKE_TIMES.forEach((option) => {
    if (fields.intake[option.id]) chips.push({ id: option.id, label: option.chip });
  });

  if (fields.intake.relation) {
    chips.push({ id: "relation", label: RELATION_CHIPS[fields.intake.relation] });
  }

  return chips;
};

export const removeSchemeChip = (
  fields: AssignmentFieldState,
  id: SchemeChipId,
): AssignmentFieldState => {
  if (id === "dose") return { ...fields, dose: "" };
  if (id === "form") return { ...fields, form: "" };
  if (id === "relation") return { ...fields, intake: { ...fields.intake, relation: "" } };
  if (id === "morning" || id === "day" || id === "evening" || id === "night") {
    return { ...fields, intake: { ...fields.intake, [id]: false } };
  }

  return fields;
};

export const standardRecommendationComment = (scheme: string, course: string) =>
  [scheme.trim(), course.trim()].filter((part) => part.length > 0).join(", ");

export type AssignmentCommentSource = "clinical-recommendation" | "user" | "none";

export type AssignmentComment = {
  text: string;
  source: AssignmentCommentSource;
};

/** Автотекст КР. Это не собственный комментарий врача. */
export const standardAssignmentComment = (scheme: string, course: string): AssignmentComment => {
  const text = standardRecommendationComment(scheme, course);

  return {
    text,
    source: text ? "clinical-recommendation" : "none",
  };
};

/**
 * Поле «Комментарий».
 * Автотекст виден только у стандартного назначения. Свой текст врача не скрывается.
 */
export const displayedAssignmentComment = (
  comment: AssignmentComment,
  customAssignment: boolean,
) => {
  if (comment.source === "user") return comment.text;
  if (comment.source === "clinical-recommendation" && !customAssignment) return comment.text;

  return "";
};

/** Первая ручная правка. Совпадение со строкой КР не делает текст автоматическим. */
export const commentAfterUserInput = (text: string): AssignmentComment => ({
  text,
  source: "user",
});

/** Свои параметры назначения убирают только автоматически подставленный текст КР. */
export const commentAfterAssignmentEdit = (
  comment: AssignmentComment,
  customAssignment: boolean,
): AssignmentComment => {
  if (!customAssignment || comment.source !== "clinical-recommendation") return comment;

  return { text: "", source: "none" };
};

/** Возврат к стандартным параметрам не записывает текст КР в ручной комментарий. */
export const commentAfterReturnToStandard = (comment: AssignmentComment): AssignmentComment => {
  if (comment.source === "user" || comment.source === "clinical-recommendation") return comment;

  return { text: "", source: "none" };
};

export const commentAfterReset = (scheme: string, course: string) =>
  standardAssignmentComment(scheme, course);

export const commentsAfterAssignmentEdit = (
  comments: Readonly<Record<string, AssignmentComment>>,
  id: string,
  customAssignment: boolean,
): Record<string, AssignmentComment> => {
  const current = comments[id];
  if (!current) return comments;

  const next = commentAfterAssignmentEdit(current, customAssignment);
  if (next === current) return comments;

  return { ...comments, [id]: next };
};

/** Заголовок «Схема» уже стоит над полем, поэтому внутри него это слово не показывается. */
export const schemeInputPlaceholder = (chipCount: number) => (chipCount > 0 ? "" : "");

export const clearedAssignmentDraft = (identity: {
  inn?: string;
  trade?: string;
  recordId?: string;
}) => ({
  inn: identity.inn ?? "",
  trade: identity.trade ?? "",
  recordId: identity.recordId ?? "",
  dose: "",
  form: "",
  scheme: "",
  course: "",
});

export type PatientCommentInput = AssignmentFieldState & {
  title: string;
  tradeName?: string;
  innName?: string;
  originalScheme: string;
  originalCourse: string;
  note?: string;
  noteCustom?: boolean;
  combination?: CombinationAssignmentView | null;
};

export type PatientCommentView = {
  mode: "recommendation" | "custom";
  summary: string;
  note: string;
};

const namesForComment = (input: PatientCommentInput) => {
  if (input.combination?.complete) {
    return {
      title: input.title,
      tradeName: input.combination.primary,
      innName: input.combination.secondary,
    };
  }

  if (input.combination) {
    return { title: input.combination.primary, tradeName: "", innName: "" };
  }

  return {
    title: input.title,
    tradeName: input.tradeName ?? "",
    innName: input.innName ?? "",
  };
};

export const buildPatientComment = (input: PatientCommentInput): PatientCommentView => {
  const names = namesForComment(input);
  const heading = medicationHeading(names.title, names.tradeName, names.innName);
  const custom = hasCustomAssignment(input);
  const summary = custom
    ? buildAssignmentPreview({
        title: heading.primary,
        selection: heading.secondary,
        dose: input.dose,
        form: input.form,
        intake: formatIntake(input.intake),
        scheme: input.schemeText,
        course: input.courseText,
      })
    : buildAssignmentPreview({
        title: heading.primary,
        selection: heading.secondary,
        scheme: input.originalScheme,
        course: input.originalCourse,
      });

  return {
    mode: custom ? "custom" : "recommendation",
    summary,
    note: input.noteCustom ? (input.note ?? "").trim() : "",
  };
};

export type SchemeCompositionRow = {
  index: number;
  name: string;
  selectedLabel: string;
  chosen: boolean;
};

export type CombinationAssignmentView = {
  complete: boolean;
  primary: string;
  secondary: string;
  rows: SchemeCompositionRow[];
};

export const showsSchemeComposition = (type: string | null | undefined) => type === "combination";

const chosenTrade = (component: MedsCatalogComponent, pick: CombinationPick | undefined) => {
  const trade = pick?.item?.name_trade.trim() ?? "";
  if (trade) return trade;
  if (component.type === "other") return component.name.trim();

  return pick?.item?.standard_MNN.trim() || pick?.inn.trim() || component.name.trim();
};

const chosenInn = (component: MedsCatalogComponent, pick: CombinationPick | undefined) => {
  const inn = pick?.item?.standard_MNN.trim() || pick?.inn.trim() || "";
  if (inn) return formatCatalogName(inn);
  if (component.type === "other") return component.name.trim();

  return component.name.trim();
};

const chosenCount = (
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | null | undefined,
) => components.filter((component, index) => isComponentChosen(component, draft?.picks[index])).length;

export const combinationAssignmentView = (
  schemeName: string,
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | null | undefined,
): CombinationAssignmentView => {
  const total = components.length;
  const ready = chosenCount(components, draft);
  const complete = total > 0 && ready === total;
  const rows = components.map((component, index) => {
    const pick = draft?.picks[index];
    const chosen = isComponentChosen(component, pick);

    return {
      index: index + 1,
      name: component.name,
      selectedLabel: chosen ? chosenTrade(component, pick) : "не выбрано",
      chosen,
    };
  });

  if (!complete) {
    return {
      complete: false,
      primary: schemeName.trim(),
      secondary: ready === 0 ? "Компоненты не выбраны" : `Выбрано ${ready} из ${total}`,
      rows,
    };
  }

  return {
    complete: true,
    primary: components
      .map((component, index) => chosenTrade(component, draft?.picks[index]))
      .join(" + "),
    secondary: components
      .map((component, index) => chosenInn(component, draft?.picks[index]))
      .join(" + "),
    rows,
  };
};

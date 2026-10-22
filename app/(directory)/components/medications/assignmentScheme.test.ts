import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMedsSelection,
  matchMedsDrug,
  readMedsCatalog,
} from "./medsClient";
import {
  chooseCombinationInn,
  chooseCombinationTrade,
  combinationSchemeRow,
  combinationSelectionSummary,
  commitCombinationDraft,
  createCombinationWizard,
} from "./combinationSelection";
import type { CombinationPick } from "./combinationSelection";
import { EMPTY_MEDS_SELECTION, type MedsCatalogComponent, type MedsCatalogItemRecord } from "./medsCatalogTypes";
import {
  assignmentFromDraft,
  buildPatientComment,
  clearedAssignmentDraft,
  combinationAssignmentView,
  EMPTY_MEDICATION_INTAKE,
  hasCustomAssignment,
  medicationHeading,
  removeSchemeChip,
  schemeChips,
  schemeInputPlaceholder,
  showsSchemeComposition,
  standardAssignmentComment,
  tableScheduleValue,
  commentAfterAssignmentEdit,
  commentAfterReset,
  commentAfterReturnToStandard,
  commentAfterUserInput,
  commentsAfterAssignmentEdit,
  displayedAssignmentComment,
  type AssignmentFieldState,
  type PatientCommentInput,
} from "./assignmentScheme";

const catalog = readMedsCatalog(["Стандартная тройная терапия", "Амоксициллин"]);

const entry = (name: string) => {
  const found = matchMedsDrug(catalog, name);
  assert.ok(found, name);
  return found;
};

const triple = entry("Стандартная тройная терапия");
assert.equal(triple.type, "combination");
if (triple.type !== "combination") throw new Error("triple");
const components = triple.combination_data;

const emptyFields = (): AssignmentFieldState => ({
  dose: "",
  form: "",
  schemeText: "",
  courseText: "",
  intake: { ...EMPTY_MEDICATION_INTAKE },
});

const kr = (
  fields: AssignmentFieldState,
  patch: Partial<PatientCommentInput> = {},
): PatientCommentInput => ({
  ...fields,
  title: "Амоксициллин",
  tradeName: "Флемоксин Солютаб",
  innName: "Амоксициллин",
  originalScheme: "1000 мг 2 раза в сутки",
  originalCourse: "14 дней",
  note: "1000 мг 2 раза в сутки, 14 дней",
  noteCustom: false,
  ...patch,
});

const selectTriple = () => {
  let state = createCombinationWizard(components, null);
  state = chooseCombinationInn(state, components, "Пантопразол");
  state = chooseCombinationTrade(state, components, 2);
  state = chooseCombinationTrade(state, components, 0);
  state = chooseCombinationTrade(state, components, 0);
  const draft = commitCombinationDraft(state, components);
  assert.ok(draft);
  return draft;
};

const record = (trade: string, inn: string): MedsCatalogItemRecord => ({
  standard_MNN: inn,
  SMNN_code: trade,
  standard_form: "",
  standard_dose: "",
  name_trade: trade,
  code_ATC: "",
  name_unit: "",
});

const drugComponent = (
  name: string,
  trade: string,
  inn: string,
): { component: MedsCatalogComponent; pick: CombinationPick } => {
  const item = record(trade, inn);

  return {
    component: { name, type: "drug", data: [{ name: inn, items: [item] }] },
    pick: { inn, item, confirmed: true },
  };
};

describe("схема назначения и комментарий для пациента", () => {
  it("выбор «День» создаёт одну плашку в строке схемы", () => {
    const fields = emptyFields();
    fields.intake.day = true;
    fields.intake.day = true;

    const chips = schemeChips(fields);

    assert.deepEqual(
      chips.map((chip) => chip.label),
      ["Днём"],
    );
    assert.equal(chips.filter((chip) => chip.id === "day").length, 1);
  });

  it("удаление плашки «Днём» снимает приём «День» и не трогает текст схемы", () => {
    const fields = emptyFields();
    fields.intake.day = true;
    fields.schemeText = "через день";

    const next = removeSchemeChip(fields, "day");

    assert.equal(next.intake.day, false);
    assert.equal(next.schemeText, "через день");
    assert.deepEqual(schemeChips(next), []);
  });

  it("«После еды» синхронизируется со схемой и комментарием из одних и тех же данных", () => {
    const fields = emptyFields();
    fields.intake.day = true;
    fields.intake.relation = "after";

    assert.deepEqual(
      schemeChips(fields).map((chip) => chip.label),
      ["Днём", "После еды"],
    );

    const comment = buildPatientComment(kr(fields, { courseText: "" }));

    assert.match(comment.summary, /днём, после еды/);
    assert.equal(comment.note, "");

    const withoutRelation = removeSchemeChip(fields, "relation");

    assert.equal(withoutRelation.intake.relation, "");
    assert.equal(withoutRelation.intake.day, true);
    assert.deepEqual(
      schemeChips(withoutRelation).map((chip) => chip.id),
      ["day"],
    );
    assert.match(buildPatientComment(kr(withoutRelation)).summary, /днём/);
    assert.doesNotMatch(buildPatientComment(kr(withoutRelation)).summary, /после еды/);
  });

  it("доза и форма обновляют схему и не превращаются в частоту приёма", () => {
    const fields = emptyFields();
    fields.dose = "1000 мг";
    fields.form = "таблетки";

    assert.deepEqual(
      schemeChips(fields).map((chip) => chip.label),
      ["1000 мг", "таблетки"],
    );

    const comment = buildPatientComment(kr(fields));

    assert.equal(comment.mode, "custom");
    assert.match(comment.summary, /1000 мг/);
    assert.match(comment.summary, /таблетки/);
    assert.doesNotMatch(comment.summary, /2 раза в сутки/);
    assert.doesNotMatch(comment.summary, /14 дней/);
    assert.equal(comment.note, "");

    const withoutDose = removeSchemeChip(fields, "dose");
    const withoutForm = removeSchemeChip(withoutDose, "form");

    assert.equal(withoutForm.dose, "");
    assert.equal(withoutForm.form, "");
    assert.equal(hasCustomAssignment(withoutForm), false);
  });

  it("пользовательская схема исключает стандартную схему КР и автоматически скопированный комментарий", () => {
    const fields = emptyFields();
    fields.intake.day = true;
    fields.schemeText = "по самочувствию";

    const comment = buildPatientComment(kr(fields));
    const text = `${comment.summary}\n${comment.note}`;

    assert.equal(comment.mode, "custom");
    assert.match(text, /по самочувствию/);
    assert.match(text, /днём/);
    assert.doesNotMatch(text, /2 раза в сутки/);
    assert.doesNotMatch(text, /14 дней/);
    const parsedFromText = emptyFields();
    parsedFromText.schemeText = "утром после еды 1000 мг";
    assert.deepEqual(schemeChips(parsedFromText), []);
  });

  it("смена курса с 14 на 5 дней не оставляет старую длительность", () => {
    const fields = emptyFields();
    fields.courseText = "5 дней";

    const comment = buildPatientComment(kr(fields));
    const text = `${comment.summary}\n${comment.note}`;

    assert.match(text, /5 дней/);
    assert.doesNotMatch(text, /14 дней/);
    assert.doesNotMatch(text, /2 раза в сутки/);
    assert.equal(
      tableScheduleValue(fields.courseText, "14 дней", true),
      "5 дней",
    );
  });

  it("удаление всех пользовательских параметров восстанавливает рекомендацию КР и сохраняет торговое название", () => {
    const cleared = clearedAssignmentDraft({
      inn: "АМОКСИЦИЛЛИН",
      trade: "Флемоксин Солютаб",
      recordId: "code",
    });
    const fields = assignmentFromDraft(cleared, undefined);
    const comment = buildPatientComment(
      kr(fields, { tradeName: cleared.trade, innName: "Амоксициллин" }),
    );

    assert.equal(cleared.trade, "Флемоксин Солютаб");
    assert.equal(cleared.inn, "АМОКСИЦИЛЛИН");
    assert.deepEqual(schemeChips(fields), []);
    assert.equal(comment.mode, "recommendation");
    assert.match(comment.summary, /Флемоксин Солютаб/);
    assert.match(comment.summary, /1000 мг 2 раза в сутки/);
    assert.match(comment.summary, /14 дней/);
    assert.equal(comment.note, "");
    assert.equal(tableScheduleValue(fields.schemeText, "1000 мг 2 раза в сутки", false), "1000 мг 2 раза в сутки");
    assert.equal(tableScheduleValue(fields.courseText, "14 дней", false), "14 дней");

    const amoxicillin = entry("Амоксициллин");
    assert.equal(amoxicillin.type, "drug");
    if (amoxicillin.type !== "drug") return;

    const selected = applyMedsSelection(amoxicillin, EMPTY_MEDS_SELECTION, {
      trade: "Флемоксин Солютаб",
    });
    const withDose = applyMedsSelection(amoxicillin, selected, { dose: "1000 мг" });
    const reset = clearedAssignmentDraft(
      applyMedsSelection(amoxicillin, withDose, { dose: "", form: "" }),
    );

    assert.equal(reset.trade, "Флемоксин Солютаб");
    assert.equal(reset.dose, "");
    assert.equal(hasCustomAssignment(assignmentFromDraft(reset)), false);
  });

  it("не восстанавливает приём из текста комментария", () => {
    const fields = assignmentFromDraft(undefined, undefined);
    const comment = buildPatientComment(
      kr(fields, {
        title: "Фамотидин",
        tradeName: "Фамотидин",
        innName: "Фамотидин",
        originalScheme: "20 мг на ночь",
        originalCourse: "14 дней",
        note: "утром, после еды, 1000 мг",
        noteCustom: false,
      }),
    );

    assert.deepEqual(schemeChips(fields), []);
    assert.equal(comment.mode, "recommendation");
    assert.match(comment.summary, /20 мг на ночь/);
    assert.doesNotMatch(comment.summary, /утром/);
    assert.equal(comment.note, "");
  });

  it("совпадающие торговое название и МНН остаются двумя строками", () => {
    assert.deepEqual(medicationHeading("Фамотидин", "Фамотидин", "Фамотидин"), {
      primary: "Фамотидин",
      secondary: "Фамотидин",
    });
    assert.deepEqual(medicationHeading("Фамотидин", "Фамотидин", "ФАМОТИДИН"), {
      primary: "Фамотидин",
      secondary: "Фамотидин",
    });
    assert.deepEqual(medicationHeading("Фамотидин", "", "ФАМОТИДИН"), {
      primary: "Фамотидин",
      secondary: "",
    });
  });

  it("заголовок combination содержит торговые названия и МНН в порядке combination_data", () => {
    const draft = selectTriple();
    const view = combinationAssignmentView("Стандартная тройная терапия", components, draft);

    assert.equal(view.complete, true);
    assert.equal(view.primary, "Нольпаза + Флемоксин Солютаб + Клацид");
    assert.equal(view.secondary, "Пантопразол + Амоксициллин + Кларитромицин");
    assert.deepEqual(
      view.rows.map((row) => `${row.index}. ${row.name}: ${row.selectedLabel}`),
      [
        "1. Ингибиторы протонного насоса: Нольпаза",
        "2. Амоксициллин: Флемоксин Солютаб",
        "3. Кларитромицин: Клацид",
      ],
    );

    const same = drugComponent("Фамотидин", "Фамотидин", "ФАМОТИДИН");
    const sameView = combinationAssignmentView("Одинаковые названия", [same.component], {
      picks: [same.pick],
    });

    assert.equal(sameView.primary, "Фамотидин");
    assert.equal(sameView.secondary, "Фамотидин");

    const pair = [drugComponent("А", "Альфа", "АЛЬФА"), drugComponent("Б", "Бета", "БЕТА")];
    const pairView = combinationAssignmentView("Двойная", pair.map((item) => item.component), {
      picks: pair.map((item) => item.pick),
    });
    const four = [
      ...pair,
      drugComponent("В", "Гамма", "ГАММА"),
      drugComponent("Г", "Дельта", "ДЕЛЬТА"),
    ];
    const fourView = combinationAssignmentView("Четверная", four.map((item) => item.component), {
      picks: four.map((item) => item.pick),
    });

    assert.equal(pairView.primary, "Альфа + Бета");
    assert.equal(pairView.secondary, "Альфа + Бета");
    assert.equal(fourView.primary, "Альфа + Бета + Гамма + Дельта");
    assert.equal(fourView.secondary, "Альфа + Бета + Гамма + Дельта");
  });

  it("состав схемы показывает выбранные и пустые компоненты без выдуманных торговых названий", () => {
    const empty = combinationAssignmentView("Стандартная тройная терапия", components, null);

    assert.equal(empty.complete, false);
    assert.equal(empty.primary, "Стандартная тройная терапия");
    assert.equal(empty.secondary, "Компоненты не выбраны");
    assert.equal(empty.rows.length, 3);
    assert.deepEqual(
      empty.rows.map((row) => row.selectedLabel),
      ["не выбрано", "не выбрано", "не выбрано"],
    );
    assert.equal(empty.rows.every((row) => row.chosen), false);
    assert.doesNotMatch(empty.primary, /Нольпаза|Флемоксин|Клацид/);

    const draft = selectTriple();
    const filled = combinationAssignmentView("Стандартная тройная терапия", components, draft);

    assert.equal(filled.rows.every((row) => row.chosen), true);
    assert.deepEqual(
      filled.rows.map((row) => row.selectedLabel),
      ["Нольпаза", "Флемоксин Солютаб", "Клацид"],
    );
  });

  it("кнопка мастера открывает существующий мастер с подтверждённым или пустым выбором", () => {
    const emptyWizard = createCombinationWizard(components, null);

    assert.equal(emptyWizard.cursor.view, "step");
    if (emptyWizard.cursor.view === "step") assert.equal(emptyWizard.cursor.step, 0);

    const confirmed = selectTriple();
    const opened = createCombinationWizard(components, confirmed);

    assert.equal(opened.cursor.view, "review");
    assert.equal(
      combinationSelectionSummary(components, opened.draft),
      combinationSelectionSummary(components, confirmed),
    );
    assert.notEqual(opened.draft, confirmed);
  });

  it("изменение компонентов обновляет заголовок, состав и строку таблицы, не подменяя название схемы", () => {
    const confirmed = selectTriple();
    const before = combinationAssignmentView("Стандартная тройная терапия", components, confirmed);
    const row = combinationSchemeRow(triple, confirmed);

    assert.equal(row?.title, "Стандартная тройная терапия");
    assert.equal(row?.summary, before.primary);
    assert.equal(row?.dose, "");
    assert.equal(row?.form, "");

    let state = createCombinationWizard(components, null);
    state = chooseCombinationInn(state, components, "Пантопразол");
    state = chooseCombinationTrade(state, components, 0);
    state = chooseCombinationTrade(state, components, 0);
    state = chooseCombinationTrade(state, components, 0);
    const changed = commitCombinationDraft(state, components);
    assert.ok(changed);
    const after = combinationAssignmentView("Стандартная тройная терапия", components, changed);
    const changedRow = combinationSchemeRow(triple, changed);

    assert.equal(after.primary, "Контролок + Флемоксин Солютаб + Клацид");
    assert.notEqual(after.primary, before.primary);
    assert.equal(after.rows[0]?.selectedLabel, "Контролок");
    assert.equal(changedRow?.title, "Стандартная тройная терапия");
    assert.equal(changedRow?.summary, after.primary);
    assert.equal(combinationSchemeRow(triple, confirmed)?.summary, before.primary);
    assert.equal(combinationSelectionSummary(components, changed), after.primary);
  });

  it("отмена правок мастера не уничтожает подтверждённый состав", () => {
    const confirmed = selectTriple();
    const editing = createCombinationWizard(components, confirmed);
    const pick = editing.draft.picks[0]?.item;
    assert.ok(pick);
    pick.name_trade = "Черновик";

    const view = combinationAssignmentView("Стандартная тройная терапия", components, confirmed);

    assert.equal(view.rows[0]?.selectedLabel, "Нольпаза");
    assert.match(view.primary, /^Нольпаза \+ /);
    assert.equal(confirmed.picks[0]?.item?.name_trade, "Нольпаза");
  });

  it("обычные типы drug, group и other не получают состав схемы и сохраняют рекомендацию КР", () => {
    assert.equal(showsSchemeComposition("drug"), false);
    assert.equal(showsSchemeComposition("group"), false);
    assert.equal(showsSchemeComposition("other"), false);
    assert.equal(showsSchemeComposition("combination"), true);
    assert.equal(showsSchemeComposition(null), false);

    const plain = buildPatientComment(
      kr(emptyFields(), {
        title: "Группа препаратов",
        tradeName: "",
        innName: "",
        combination: null,
      }),
    );

    assert.equal(plain.mode, "recommendation");
    assert.match(plain.summary, /Группа препаратов/);
    assert.match(plain.summary, /1000 мг 2 раза в сутки/);
    assert.match(plain.summary, /14 дней/);
    assert.equal(plain.note, "");
  });

  it("placeholder схемы не появляется рядом с плашками и не становится значением", () => {
    const fields = emptyFields();
    fields.dose = "500 мг";
    fields.intake.evening = true;
    fields.intake.relation = "before";

    assert.deepEqual(
      schemeChips(fields).map((chip) => chip.label),
      ["500 мг", "Вечером", "До еды"],
    );
    assert.equal(schemeInputPlaceholder(schemeChips(fields).length), "");
    assert.notEqual(schemeInputPlaceholder(schemeChips(fields).length), "Схема");
    assert.equal(schemeInputPlaceholder(0), "");
    assert.equal(tableScheduleValue(fields.schemeText, "1000 мг 2 раза в сутки", true), "");
    assert.notEqual(fields.schemeText, "Схема");
  });

  it("при переходе на свои параметры автотекст КР уходит из комментария, свой текст остаётся", () => {
    const fields = emptyFields();
    fields.intake.day = true;
    fields.intake.relation = "with";
    fields.courseText = "5 дней";
    const auto = standardAssignmentComment("1000 мг 2 раза в сутки", "14 дней");

    assert.equal(auto.source, "clinical-recommendation");
    assert.equal(displayedAssignmentComment(auto, false), "1000 мг 2 раза в сутки, 14 дней");
    assert.deepEqual(
      schemeChips(fields).map((chip) => chip.label),
      ["Днём", "Во время еды"],
    );

    const cleared = commentAfterAssignmentEdit(auto, hasCustomAssignment(fields));

    assert.equal(auto.text, "1000 мг 2 раза в сутки, 14 дней");
    assert.equal(cleared.source, "none");
    assert.equal(cleared.text, "");
    assert.equal(displayedAssignmentComment(cleared, true), "");

    const patient = buildPatientComment(
      kr(fields, { note: cleared.text, noteCustom: false }),
    );

    assert.equal(patient.mode, "custom");
    assert.match(patient.summary, /днём, во время еды/);
    assert.match(patient.summary, /5 дней/);
    assert.doesNotMatch(patient.summary, /2 раза в сутки/);
    assert.doesNotMatch(patient.summary, /14 дней/);
    assert.equal(patient.note, "");

    const manual = commentAfterUserInput("При появлении сыпи прекратить приём и обратиться к врачу");
    const kept = commentAfterAssignmentEdit(manual, true);

    assert.equal(kept.source, "user");
    assert.equal(kept.text, manual.text);
    assert.equal(displayedAssignmentComment(kept, true), manual.text);

    const sameAsRecommendation = commentAfterUserInput("1000 мг 2 раза в сутки, 14 дней");
    const stillUser = commentAfterAssignmentEdit(sameAsRecommendation, true);

    assert.equal(stillUser.source, "user");
    assert.equal(displayedAssignmentComment(stillUser, true), "1000 мг 2 раза в сутки, 14 дней");
  });

  it("возврат к стандартным настройкам восстанавливает назначение и не записывает КР в ручной комментарий", () => {
    const custom = emptyFields();
    custom.courseText = "5 дней";
    const edited = commentAfterAssignmentEdit(
      standardAssignmentComment("1000 мг 2 раза в сутки", "14 дней"),
      hasCustomAssignment(custom),
    );
    const returned = commentAfterReturnToStandard(edited);
    const fields = assignmentFromDraft(
      clearedAssignmentDraft({
        inn: "АМОКСИЦИЛЛИН",
        trade: "Флемоксин Солютаб",
        recordId: "code",
      }),
    );
    const patient = buildPatientComment(
      kr(fields, {
        tradeName: "Флемоксин Солютаб",
        note: returned.text,
        noteCustom: returned.source === "user",
      }),
    );

    assert.equal(hasCustomAssignment(fields), false);
    assert.equal(returned.source, "none");
    assert.equal(displayedAssignmentComment(returned, false), "");
    assert.equal(patient.mode, "recommendation");
    assert.match(patient.summary, /Флемоксин Солютаб/);
    assert.match(patient.summary, /1000 мг 2 раза в сутки/);
    assert.match(patient.summary, /14 дней/);
    assert.equal(patient.note, "");
    assert.equal(tableScheduleValue(fields.courseText, "14 дней", false), "14 дней");

    const user = commentAfterReturnToStandard(
      commentAfterUserInput("При появлении сыпи прекратить приём и обратиться к врачу"),
    );

    assert.equal(user.source, "user");
    assert.equal(user.text, "При появлении сыпи прекратить приём и обратиться к врачу");
  });

  it("сброс возвращает автотекст КР, а повторное открытие не возвращает устаревший текст", () => {
    const stale = commentAfterAssignmentEdit(
      standardAssignmentComment("1000 мг 2 раза в сутки", "14 дней"),
      true,
    );
    const reset = commentAfterReset("1000 мг 2 раза в сутки", "14 дней");

    assert.equal(reset.source, "clinical-recommendation");
    assert.equal(displayedAssignmentComment(reset, false), "1000 мг 2 раза в сутки, 14 дней");
    assert.equal(stale.source, "none");
    assert.equal(displayedAssignmentComment(stale, true), "");
    assert.notEqual(displayedAssignmentComment(stale, true), reset.text);

    const comments = {
      amoxicillin: stale,
      other: standardAssignmentComment("20 мг на ночь", "14 дней"),
    };
    const next = commentsAfterAssignmentEdit(comments, "other", true);

    assert.equal(next.amoxicillin, stale);
    assert.equal(next.other?.source, "none");
    assert.equal(next.other?.text, "");
    assert.equal(comments.other.source, "clinical-recommendation");
  });
});

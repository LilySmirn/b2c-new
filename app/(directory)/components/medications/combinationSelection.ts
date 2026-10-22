/**
 * Последовательный выбор препаратов многокомпонентной схемы.
 * Число шагов берётся только из `combination_data`, не из названия назначения.
 */

import type {
  MedsCatalogComponent,
  MedsCatalogEntry,
  MedsCatalogItemRecord,
} from "./medsCatalogTypes";
import { compareRu } from "./ruSort";

export type CombinationPick = {
  inn: string;
  item: MedsCatalogItemRecord | null;
  confirmed: boolean;
};

export type CombinationDraft = {
  picks: CombinationPick[];
};

export type CombinationStepStage = "inn" | "items" | "confirm";

export type CombinationCursor =
  | { view: "step"; step: number; stage: CombinationStepStage }
  | { view: "review" };

export type CombinationWizardState = {
  draft: CombinationDraft;
  cursor: CombinationCursor;
};

export type CombinationStep = {
  index: number;
  name: string;
  type: MedsCatalogComponent["type"];
};

export type CombinationCard = {
  title: string;
  details: string[];
};

const emptyPick = (): CombinationPick => ({
  inn: "",
  item: null,
  confirmed: false,
});

const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

const sameName = (left: string, right: string) => normalizeName(left) === normalizeName(right);

export const ruNoun = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;

  return many;
};

export const schemeBadgeText = (count: number) =>
  `Схема · ${count} ${ruNoun(count, "препарат", "препарата", "препаратов")}`;

export const combinationPrompt = (count: number) =>
  `Выберите ${count} ${ruNoun(count, "отдельный препарат", "отдельных препарата", "отдельных препаратов")}: сначала действующее вещество, затем торговое наименование.`;

export const combinationComponents = (
  entry: MedsCatalogEntry | null | undefined,
): MedsCatalogComponent[] => (entry?.type === "combination" ? entry.combination_data : []);

export const combinationDrugCount = (entry: MedsCatalogEntry | null | undefined) =>
  entry?.type === "combination" ? entry.combination_data.length : null;

export const combinationSteps = (
  components: readonly MedsCatalogComponent[],
): CombinationStep[] =>
  components.map((component, index) => ({
    index,
    name: component.name,
    type: component.type,
  }));

export const cloneCombinationDraft = (draft: CombinationDraft): CombinationDraft =>
  structuredClone(draft);

export const emptyCombinationDraft = (count: number): CombinationDraft => ({
  picks: Array.from({ length: count }, emptyPick),
});

export const sameCatalogItem = (
  left: MedsCatalogItemRecord,
  right: MedsCatalogItemRecord,
) =>
  left.standard_MNN === right.standard_MNN &&
  left.SMNN_code === right.SMNN_code &&
  left.standard_form === right.standard_form &&
  left.standard_dose === right.standard_dose &&
  left.name_trade === right.name_trade &&
  left.code_ATC === right.code_ATC &&
  left.name_unit === right.name_unit;

export const innsOf = (component: MedsCatalogComponent) => {
  if (component.type !== "group") return [];

  const seen = new Set<string>();
  const names: string[] = [];

  component.data.forEach((group) => {
    const key = normalizeName(group.name);
    if (!key || seen.has(key)) return;

    seen.add(key);
    names.push(group.name);
  });

  return names;
};

/**
 * Варианты для списка мастера. Порядок `combination_data` и `tradeItemsOf` не меняется.
 * Одинаковое торговое имя с другой дозой или формой остаётся отдельной строкой.
 */
export const sortedTradeChoices = (items: readonly MedsCatalogItemRecord[]) =>
  items
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .sort((left, right) => {
      const leftLabel = left.item.name_trade.trim() || left.item.standard_MNN.trim();
      const rightLabel = right.item.name_trade.trim() || right.item.standard_MNN.trim();
      const byTrade = compareRu(leftLabel, rightLabel);
      if (byTrade !== 0) return byTrade;

      return left.sourceIndex - right.sourceIndex;
    });

/** Торговые записи компонента. Одинаковые названия с разной дозой или формой не склеиваются. */
export const tradeItemsOf = (component: MedsCatalogComponent, inn: string) => {
  if (component.type === "drug") return component.data[0]?.items ?? [];

  if (component.type !== "group" || !inn.trim()) return [];

  return component.data.find((group) => sameName(group.name, inn))?.items ?? [];
};

export const isComponentChosen = (
  component: MedsCatalogComponent,
  pick: CombinationPick | undefined,
) => {
  if (!pick) return false;

  if (component.type === "other") return pick.confirmed && pick.item === null;

  if (!pick.item) return false;

  const inn = component.type === "group" ? pick.inn : "";

  return tradeItemsOf(component, inn).some((item) => sameCatalogItem(item, pick.item as MedsCatalogItemRecord));
};

export const isDraftComplete = (
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | null | undefined,
) => {
  if (!draft || components.length === 0 || draft.picks.length !== components.length) return false;

  return components.every((component, index) => isComponentChosen(component, draft.picks[index]));
};

export const sanitizeCombinationDraft = (
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | null | undefined,
): CombinationDraft | null => (draft && isDraftComplete(components, draft) ? draft : null);

const stageFor = (
  component: MedsCatalogComponent,
  pick: CombinationPick | undefined,
): CombinationStepStage => {
  if (component.type === "other") return "confirm";
  if (component.type === "drug") return "items";

  return pick?.inn.trim() ? "items" : "inn";
};

const stepCursor = (
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft,
  step: number,
): CombinationCursor => {
  const component = components[step];
  if (!component) return { view: "review" };

  return {
    view: "step",
    step,
    stage: stageFor(component, draft.picks[step]),
  };
};

export const createCombinationWizard = (
  components: readonly MedsCatalogComponent[],
  confirmed: CombinationDraft | null,
): CombinationWizardState => {
  const draft =
    confirmed && confirmed.picks.length === components.length
      ? cloneCombinationDraft(confirmed)
      : emptyCombinationDraft(components.length);

  if (isDraftComplete(components, draft)) {
    return { draft, cursor: { view: "review" } };
  }

  const incomplete = components.findIndex(
    (component, index) => !isComponentChosen(component, draft.picks[index]),
  );
  const step = incomplete === -1 ? 0 : incomplete;

  return { draft, cursor: stepCursor(components, draft, step) };
};

export const restartCombinationWizard = (
  components: readonly MedsCatalogComponent[],
): CombinationWizardState => createCombinationWizard(components, null);

const replacePick = (
  draft: CombinationDraft,
  step: number,
  pick: CombinationPick,
): CombinationDraft => {
  const picks = draft.picks.slice();
  picks[step] = pick;

  return { picks };
};

export const chooseCombinationInn = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
  inn: string,
): CombinationWizardState => {
  if (state.cursor.view !== "step") return state;

  const step = state.cursor.step;
  const component = components[step];
  if (component?.type !== "group") return state;

  const canonical = innsOf(component).find((name) => sameName(name, inn));
  if (!canonical) return state;

  const current = state.draft.picks[step] ?? emptyPick();
  const innChanged = !sameName(current.inn, canonical);
  const draft = replacePick(state.draft, step, {
    inn: canonical,
    item: innChanged ? null : current.item,
    confirmed: innChanged ? false : current.confirmed,
  });

  return {
    draft,
    cursor: { view: "step", step, stage: "items" },
  };
};

const advanceAfterChoice = (
  draft: CombinationDraft,
  components: readonly MedsCatalogComponent[],
  step: number,
): CombinationWizardState => {
  if (step + 1 < components.length) {
    return { draft, cursor: stepCursor(components, draft, step + 1) };
  }

  if (isDraftComplete(components, draft)) {
    return { draft, cursor: { view: "review" } };
  }

  return { draft, cursor: stepCursor(components, draft, step) };
};

export const chooseCombinationTrade = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
  itemIndex: number,
): CombinationWizardState => {
  if (state.cursor.view !== "step") return state;

  const step = state.cursor.step;
  const component = components[step];
  if (!component || component.type === "other") return state;

  const current = state.draft.picks[step] ?? emptyPick();
  if (component.type === "group" && !current.inn.trim()) return state;

  const source = tradeItemsOf(component, current.inn)[itemIndex];
  if (!source) return state;

  const draft = replacePick(state.draft, step, {
    inn:
      component.type === "group"
        ? current.inn
        : source.standard_MNN.trim() || component.data[0]?.name || "",
    item: structuredClone(source),
    confirmed: true,
  });

  return advanceAfterChoice(draft, components, step);
};

export const confirmCombinationOther = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
): CombinationWizardState => {
  if (state.cursor.view !== "step") return state;

  const step = state.cursor.step;
  const component = components[step];
  if (component?.type !== "other") return state;

  const draft = replacePick(state.draft, step, {
    inn: "",
    item: null,
    confirmed: true,
  });

  return advanceAfterChoice(draft, components, step);
};

export const showCombinationInnList = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
): CombinationWizardState => {
  if (state.cursor.view !== "step") return state;

  const component = components[state.cursor.step];
  if (component?.type !== "group") return state;

  return {
    draft: state.draft,
    cursor: { view: "step", step: state.cursor.step, stage: "inn" },
  };
};

export const goToCombinationStep = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
  step: number,
): CombinationWizardState => {
  if (step < 0 || step >= components.length) return state;

  return {
    draft: state.draft,
    cursor: stepCursor(components, state.draft, step),
  };
};

export const canGoBackCombination = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
) => {
  if (components.length === 0) return false;
  if (state.cursor.view === "review") return true;

  return state.cursor.step > 0;
};

export const goBackCombination = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
): CombinationWizardState => {
  if (!canGoBackCombination(state, components)) return state;

  if (state.cursor.view === "review") {
    return goToCombinationStep(state, components, components.length - 1);
  }

  return goToCombinationStep(state, components, state.cursor.step - 1);
};

export const canAdvanceCombination = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
) => {
  if (state.cursor.view !== "step") return false;

  const step = state.cursor.step;
  const component = components[step];
  if (!component || !isComponentChosen(component, state.draft.picks[step])) return false;

  if (step < components.length - 1) return true;

  return isDraftComplete(components, state.draft);
};

export const goNextCombination = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
): CombinationWizardState => {
  if (!canAdvanceCombination(state, components) || state.cursor.view !== "step") return state;

  if (state.cursor.step < components.length - 1) {
    return goToCombinationStep(state, components, state.cursor.step + 1);
  }

  return { draft: state.draft, cursor: { view: "review" } };
};

export const canCommitCombination = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
) => state.cursor.view === "review" && isDraftComplete(components, state.draft);

export const commitCombinationDraft = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
): CombinationDraft | null =>
  canCommitCombination(state, components) ? cloneCombinationDraft(state.draft) : null;

const chosenLabel = (component: MedsCatalogComponent, pick: CombinationPick | undefined) => {
  const trade = pick?.item?.name_trade.trim() ?? "";
  if (trade) return trade;
  if (component.type === "other") return component.name.trim();

  return pick?.item?.standard_MNN.trim() || pick?.inn.trim() || component.name.trim();
};

export const combinationSelectionSummary = (
  components: readonly MedsCatalogComponent[],
  draft: CombinationDraft | null | undefined,
) => {
  if (!draft || !isDraftComplete(components, draft)) return "";

  return components.map((component, index) => chosenLabel(component, draft.picks[index])).join(" + ");
};

export const combinationProgressLabel = (
  state: CombinationWizardState,
  components: readonly MedsCatalogComponent[],
) => {
  const ready = components.filter((component, index) =>
    isComponentChosen(component, state.draft.picks[index]),
  ).length;
  const total = components.length;

  if (state.cursor.view === "review") {
    return `Итог · все компоненты выбраны · выбрано ${ready} из ${total}`;
  }

  return `Шаг ${state.cursor.step + 1} из ${total} · выбрано ${ready} из ${total}`;
};

export const catalogItemCard = (
  item: MedsCatalogItemRecord,
  fallbackName: string,
): CombinationCard => {
  const title = item.name_trade.trim() || item.standard_MNN.trim() || fallbackName;
  const inn = item.standard_MNN.trim();
  const dose = item.standard_dose.trim();
  const form = item.standard_form.trim();
  const details = [
    inn && inn !== title ? `МНН ${inn}` : "",
    dose,
    form,
  ].filter((value) => value.length > 0);

  return { title, details };
};

export const combinationReviewCard = (
  component: MedsCatalogComponent,
  pick: CombinationPick | undefined,
): CombinationCard => {
  if (!pick?.item || !isComponentChosen(component, pick)) {
    return { title: component.name, details: [] };
  }

  return catalogItemCard(pick.item, component.name);
};

export const combinationSlotText = (
  component: MedsCatalogComponent,
  pick: CombinationPick | undefined,
) => {
  if (!pick || !isComponentChosen(component, pick)) {
    if (component.type === "group" && pick?.inn.trim() && !pick.item) {
      return `${pick.inn} · выберите торговое наименование`;
    }

    return "не выбрано";
  }

  if (component.type === "other") return component.name;

  const card = combinationReviewCard(component, pick);

  return card.details.length > 0 ? `${card.title} · ${card.details.join(" · ")}` : card.title;
};

/** Строка таблицы остаётся схемой: название не заменяется, доза и форма строки не берутся из компонента. */
export const combinationSchemeRow = (
  entry: MedsCatalogEntry,
  draft: CombinationDraft | null,
) => {
  if (entry.type !== "combination") return null;

  return {
    title: entry.name,
    componentCount: entry.combination_data.length,
    summary: combinationSelectionSummary(entry.combination_data, draft),
    dose: "",
    form: "",
  };
};

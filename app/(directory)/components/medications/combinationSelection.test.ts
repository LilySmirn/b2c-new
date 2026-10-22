import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMedsRowView,
  matchMedsDrug,
} from "./medsClient";
import { readMedsCatalog } from "./medsMockCatalog";
import {
  canCommitCombination,
  catalogItemCard,
  chooseCombinationInn,
  chooseCombinationTrade,
  combinationDrugCount,
  combinationPrompt,
  combinationReviewCard,
  combinationSchemeRow,
  combinationSelectionSummary,
  combinationSteps,
  commitCombinationDraft,
  confirmCombinationOther,
  createCombinationWizard,
  goBackCombination,
  goNextCombination,
  goToCombinationStep,
  isDraftComplete,
  innsOf,
  restartCombinationWizard,
  schemeBadgeText,
  showCombinationInnList,
  sortedTradeChoices,
  tradeItemsOf,
  cloneCombinationDraft,
  type CombinationWizardState,
} from "./combinationSelection";
import {
  parseCombinationSelectionMap,
  readCombinationSelectionMap,
  writeCombinationSelection,
  type CombinationStorage,
} from "./combinationSelectionStorage";
import { EMPTY_MEDS_SELECTION, type MedsCatalogComponent, type MedsCatalogEntry } from "./medsCatalogTypes";
import { sortedRuLabels } from "./ruSort";

const catalog = readMedsCatalog([
  "Стандартная тройная терапия",
  "Омепразол + фактор VIII + Ромашка",
  "Кларитромицин",
  "Амоксициллин",
  "Метронидазол",
]);

const entry = (name: string) => {
  const found = matchMedsDrug(catalog, name);
  assert.ok(found, name);
  return found;
};

const asCombination = (name: string) => {
  const found = entry(name);
  assert.equal(found.type, "combination");
  if (found.type !== "combination") throw new Error(name);
  return found;
};

const asDrug = (name: string) => {
  const found = entry(name);
  assert.equal(found.type, "drug");
  if (found.type !== "drug") throw new Error(name);
  return found;
};

const triple = asCombination("Стандартная тройная терапия");
const components = triple.combination_data;
const mixed = asCombination("Омепразол + фактор VIII + Ромашка").combination_data;

const memoryStorage = (): CombinationStorage & { raw: Map<string, string> } => {
  const raw = new Map<string, string>();

  return {
    raw,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => {
      raw.set(key, value);
    },
  };
};

const selectTriple = () => {
  let state = createCombinationWizard(components, null);
  state = chooseCombinationInn(state, components, "Пантопразол");
  state = chooseCombinationTrade(state, components, 2);
  state = chooseCombinationTrade(state, components, 0);
  state = chooseCombinationTrade(state, components, 0);
  return state;
};

const selectMixed = () => {
  let state = createCombinationWizard(mixed, null);
  state = chooseCombinationTrade(state, mixed, 0);
  state = chooseCombinationInn(state, mixed, "ОКТОКОГ АЛЬФА");
  state = chooseCombinationTrade(state, mixed, 0);
  state = confirmCombinationOther(state, mixed);
  return state;
};

describe("выбор многокомпонентной схемы", () => {
  it("читает combination_data тройной терапии и считает компоненты по массиву", () => {
    assert.deepEqual(
      components.map((item) => item.name),
      ["Ингибиторы протонного насоса", "Амоксициллин", "Кларитромицин"],
    );
    assert.deepEqual(
      components.map((item) => item.type),
      ["group", "drug", "drug"],
    );
    assert.equal(combinationDrugCount(triple), 3);
    assert.equal(components.length, 3);

    const namedAsTripleButShorter: MedsCatalogEntry = {
      ...triple,
      combination_data: components.slice(0, 2),
    };
    assert.equal(combinationDrugCount(namedAsTripleButShorter), 2);
    assert.equal(schemeBadgeText(2).toLocaleUpperCase("ru-RU"), "СХЕМА · 2 ПРЕПАРАТА");
    assert.equal(schemeBadgeText(3).toLocaleUpperCase("ru-RU"), "СХЕМА · 3 ПРЕПАРАТА");
    assert.equal(schemeBadgeText(4).toLocaleUpperCase("ru-RU"), "СХЕМА · 4 ПРЕПАРАТА");
    assert.match(combinationPrompt(3), /^Выберите 3 отдельных препарата:/);
  });

  it("строит шаги для 2, 3 и 4 компонентов в исходном порядке", () => {
    const two = components.slice(0, 2);
    const metronidazole = asDrug("Метронидазол");
    const four: MedsCatalogComponent[] = [
      ...components,
      { name: metronidazole.name, type: "drug", data: metronidazole.data },
    ];

    assert.deepEqual(
      combinationSteps(two).map((step) => `${step.index}:${step.type}:${step.name}`),
      ["0:group:Ингибиторы протонного насоса", "1:drug:Амоксициллин"],
    );
    assert.equal(combinationSteps(components).length, 3);
    assert.deepEqual(
      combinationSteps(four).map((step) => step.type),
      ["group", "drug", "drug", "drug"],
    );
    assert.equal(createCombinationWizard(four, null).cursor.view, "step");
  });

  it("для группы выбирает МНН и отдельную торговую запись, не склеивая дозы", () => {
    const items = tradeItemsOf(components[0], "ПАНТОПРАЗОЛ");
    assert.deepEqual(
      items.map((item) => `${item.name_trade}|${item.standard_dose}|${item.standard_form}`),
      ["Контролок|20 мг|ТАБЛЕТКИ", "Контролок|40 мг|ТАБЛЕТКИ", "Нольпаза|40 мг|ТАБЛЕТКИ"],
    );

    let state = createCombinationWizard(components, null);
    assert.equal(state.cursor.view, "step");
    if (state.cursor.view !== "step") return;
    assert.equal(state.cursor.stage, "inn");

    const beforeTrade = chooseCombinationTrade(state, components, 0);
    assert.equal(beforeTrade.draft.picks[0]?.item, null);

    state = chooseCombinationInn(state, components, "Пантопразол");
    assert.equal(state.cursor.view, "step");
    if (state.cursor.view !== "step") return;
    assert.equal(state.cursor.stage, "items");
    assert.equal(state.draft.picks[0]?.inn, "ПАНТОПРАЗОЛ");

    state = chooseCombinationTrade(state, components, 2);
    const chosen = state.draft.picks[0]?.item;
    assert.equal(chosen?.name_trade, "Нольпаза");
    assert.equal(chosen?.standard_dose, "40 мг");
    assert.equal(chosen?.standard_MNN, "ПАНТОПРАЗОЛ");
    assert.equal(chosen?.name_unit, "таблетка");
    assert.equal(chosen?.code_ATC, "A02BC02");
    assert.notEqual(chosen, items[2]);
    assert.deepEqual(catalogItemCard(items[0], "ИПН").details, [
      "МНН ПАНТОПРАЗОЛ",
      "20 мг",
      "ТАБЛЕТКИ",
    ]);
    assert.notEqual(catalogItemCard(items[0], "ИПН").details[1], catalogItemCard(items[1], "ИПН").details[1]);
  });

  it("для препарата показывает торговые записи без отдельного шага МНН", () => {
    let state = createCombinationWizard(components, null);
    state = chooseCombinationInn(state, components, "ПАНТОПРАЗОЛ");
    state = chooseCombinationTrade(state, components, 2);
    assert.equal(state.cursor.view, "step");
    if (state.cursor.view !== "step") return;
    assert.equal(state.cursor.step, 1);
    assert.equal(state.cursor.stage, "items");
    assert.equal(components[1]?.type, "drug");

    const trades = tradeItemsOf(components[1], "");
    assert.deepEqual(
      trades.map((item) => `${item.name_trade}|${item.standard_dose}`),
      ["Флемоксин Солютаб|500 мг", "Флемоксин Солютаб|1000 мг", "Амоксициллин|500 мг"],
    );

    state = chooseCombinationTrade(state, components, 0);
    assert.equal(state.draft.picks[1]?.item?.name_trade, "Флемоксин Солютаб");
    assert.equal(state.draft.picks[1]?.item?.standard_dose, "500 мг");
    assert.equal(state.draft.picks[1]?.inn, "АМОКСИЦИЛЛИН");
    assert.notEqual(state.draft.picks[1]?.item, trades[0]);
  });

  it("подтверждает other без выдуманных торгового имени, дозы и формы", () => {
    const other = mixed[2];
    assert.equal(other?.type, "other");
    const source = other?.data[0]?.items[0];
    assert.equal(source?.name_trade, "");
    assert.equal(source?.standard_dose, "");
    assert.equal(source?.standard_form, "");
    assert.equal(source?.SMNN_code, "");
    assert.deepEqual(catalogItemCard(source!, "Ромашка"), { title: "Ромашка", details: [] });

    let state = createCombinationWizard(mixed, null);
    state = chooseCombinationTrade(state, mixed, 0);
    assert.equal(state.draft.picks[0]?.item?.SMNN_code, "21.20.10.112-000001-1-00122-0000000000000");
    assert.equal(state.draft.picks[0]?.item?.name_unit, "шт. (капсула)");
    state = chooseCombinationInn(state, mixed, "ОКТОКОГ АЛЬФА");
    state = chooseCombinationTrade(state, mixed, 0);
    assert.equal(state.cursor.view, "step");
    if (state.cursor.view !== "step") return;
    assert.equal(state.cursor.stage, "confirm");

    state = confirmCombinationOther(state, mixed);
    assert.equal(state.draft.picks[2]?.item, null);
    assert.equal(state.draft.picks[2]?.confirmed, true);
    assert.deepEqual(combinationReviewCard(mixed[2], state.draft.picks[2]), {
      title: "Ромашка",
      details: [],
    });
    assert.equal(
      combinationSelectionSummary(mixed, state.draft),
      "Омепразол + Адвейт + Ромашка",
    );
  });

  it("сохраняет выбор при возврате и не открывает итог, пока схема не собрана", () => {
    let state = createCombinationWizard(components, null);
    state = chooseCombinationInn(state, components, "ПАНТОПРАЗОЛ");
    assert.equal(goNextCombination(state, components), state);
    state = chooseCombinationTrade(state, components, 2);
    state = chooseCombinationTrade(state, components, 0);
    assert.equal(commitCombinationDraft(state, components), null);
    assert.equal(canCommitCombination(state, components), false);
    assert.equal(goNextCombination(state, components), state);

    state = chooseCombinationTrade(state, components, 0);
    assert.equal(state.cursor.view, "review");
    const committed = commitCombinationDraft(state, components);
    assert.ok(committed);
    assert.equal(
      combinationSelectionSummary(components, committed),
      "Нольпаза + Флемоксин Солютаб + Клацид",
    );

    const backToLast = goBackCombination(state, components);
    assert.equal(backToLast.cursor.view, "step");
    if (backToLast.cursor.view !== "step") return;
    assert.equal(backToLast.cursor.step, 2);
    assert.equal(backToLast.draft.picks[0]?.item?.name_trade, "Нольпаза");
    assert.equal(backToLast.draft.picks[1]?.item?.name_trade, "Флемоксин Солютаб");
    assert.equal(backToLast.draft.picks[2]?.item?.name_trade, "Клацид");
    assert.equal(commitCombinationDraft(backToLast, components), null);

    const backToGroup = goToCombinationStep(backToLast, components, 0);
    const innList = showCombinationInnList(backToGroup, components);
    assert.equal(innList.cursor.view, "step");
    if (innList.cursor.view !== "step") return;
    assert.equal(innList.cursor.stage, "inn");
    assert.equal(innList.draft.picks[0]?.item?.name_trade, "Нольпаза");

    const changedInn = chooseCombinationInn(innList, components, "ОМЕПРАЗОЛ");
    assert.equal(changedInn.draft.picks[0]?.item, null);
    assert.equal(changedInn.draft.picks[1]?.item?.name_trade, "Флемоксин Солютаб");
    assert.equal(changedInn.draft.picks[2]?.item?.standard_dose, "250 мг");
    assert.equal(isDraftComplete(components, changedInn.draft), false);

    const reviewed = goNextCombination(backToLast, components);
    assert.equal(reviewed.cursor.view, "review");
  });

  it("оставляет одну строку схемы и позволяет править черновик, не трогая подтверждённый выбор", () => {
    const state = selectTriple();
    const committed = commitCombinationDraft(state, components);
    assert.ok(committed);
    const row = combinationSchemeRow(triple, committed);
    assert.deepEqual(row, {
      title: "Стандартная тройная терапия",
      componentCount: 3,
      summary: "Нольпаза + Флемоксин Солютаб + Клацид",
      dose: "",
      form: "",
    });

    const snapshot = cloneCombinationDraft(committed);
    const editing = createCombinationWizard(components, committed);
    assert.equal(editing.cursor.view, "review");
    assert.equal(combinationSelectionSummary(components, editing.draft), row?.summary);
    assert.notEqual(editing.draft, committed);

    const pick = editing.draft.picks[0]?.item;
    assert.ok(pick);
    pick.name_trade = "Испорчено";
    assert.equal(snapshot.picks[0]?.item?.name_trade, "Нольпаза");
    assert.equal(committed.picks[0]?.item?.name_trade, "Нольпаза");

    const restarted = restartCombinationWizard(components);
    assert.equal(isDraftComplete(components, restarted.draft), false);
    assert.equal(commitCombinationDraft(restarted, components), null);
    assert.equal(snapshot.picks[0]?.item?.name_trade, "Нольпаза");
    assert.equal(restarted.cursor.view, "step");
  });

  it("хранит подтверждённый выбор по рекомендации и строке и читает его заново", () => {
    const tripleDraft = commitCombinationDraft(selectTriple(), components);
    const mixedDraft = commitCombinationDraft(selectMixed(), mixed);
    assert.ok(tripleDraft);
    assert.ok(mixedDraft);

    const session = memoryStorage();
    const local = memoryStorage();
    const storages = [session, local];
    writeCombinationSelection(storages, "recommendation-a", "row-triple", tripleDraft);
    writeCombinationSelection(storages, "recommendation-a", "row-same-title", mixedDraft);
    writeCombinationSelection(storages, "recommendation-b", "row-triple", mixedDraft);

    const stored = readCombinationSelectionMap(storages);
    assert.equal(stored["recommendation-a"]?.["row-triple"]?.picks[0]?.item?.name_trade, "Нольпаза");
    assert.equal(stored["recommendation-a"]?.["row-same-title"]?.picks[2]?.item, null);
    assert.equal(stored["recommendation-a"]?.["row-same-title"]?.picks[2]?.confirmed, true);
    assert.equal(stored["recommendation-b"]?.["row-triple"]?.picks[0]?.item?.name_trade, "Омепразол");
    assert.notEqual(
      stored["recommendation-a"]?.["row-triple"]?.picks[0]?.item?.name_trade,
      stored["recommendation-b"]?.["row-triple"]?.picks[0]?.item?.name_trade,
    );

    const freshSession = memoryStorage();
    const restored = readCombinationSelectionMap([freshSession, local]);
    assert.equal(
      combinationSelectionSummary(components, restored["recommendation-a"]?.["row-triple"] ?? null),
      "Нольпаза + Флемоксин Солютаб + Клацид",
    );

    const parsed = parseCombinationSelectionMap(
      JSON.stringify({
        "recommendation-a": {
          "row-triple": tripleDraft,
          "broken": { picks: [{ inn: 1, confirmed: true, item: null }] },
        },
      }),
    );
    assert.equal(parsed?.["recommendation-a"]?.["row-triple"]?.picks.length, 3);
    assert.equal(parsed?.["recommendation-a"]?.["broken"], undefined);
  });

  it("не меняет выбор обычного препарата и группы", () => {
    const clarithromycin = entry("Кларитромицин");
    const amoxicillin = entry("Амоксициллин");
    assert.equal(combinationDrugCount(clarithromycin), null);
    assert.equal(combinationDrugCount(amoxicillin), null);
    assert.equal(combinationSchemeRow(clarithromycin, null), null);

    const view = buildMedsRowView(clarithromycin, EMPTY_MEDS_SELECTION);
    assert.equal(view.nameMenu?.mode, "drug");
    assert.deepEqual(view.nameMenu && "trades" in view.nameMenu ? view.nameMenu.trades : [], [
      "Клацид",
      "Фромилид",
    ]);
    assert.deepEqual(view.doseOptions, ["250 мг", "500 мг"]);
    assert.equal(createCombinationWizard(components, null).draft.picks.every((pick) => pick.item === null), true);
  });

  it("доводит схему из 2 и 4 компонентов до итога только после каждого шага", () => {
    const finish = (list: readonly MedsCatalogComponent[], choose: (state: CombinationWizardState) => CombinationWizardState) => {
      const done = choose(createCombinationWizard(list, null));
      assert.equal(done.cursor.view, "review");
      assert.equal(canCommitCombination(done, list), true);
      return done;
    };

    const two = components.slice(0, 2);
    finish(two, (state) => {
      let next = chooseCombinationInn(state, two, "ПАНТОПРАЗОЛ");
      next = chooseCombinationTrade(next, two, 2);
      assert.equal(commitCombinationDraft(next, two), null);
      return chooseCombinationTrade(next, two, 0);
    });

    const metronidazole = asDrug("Метронидазол");
    const four: MedsCatalogComponent[] = [
      ...components,
      { name: metronidazole.name, type: "drug", data: metronidazole.data },
    ];
    const fourDone = finish(four, (state) => {
      let next = chooseCombinationInn(state, four, "ПАНТОПРАЗОЛ");
      next = chooseCombinationTrade(next, four, 2);
      next = chooseCombinationTrade(next, four, 0);
      next = chooseCombinationTrade(next, four, 0);
      assert.equal(next.cursor.view, "step");
      assert.equal(commitCombinationDraft(next, four), null);
      return chooseCombinationTrade(next, four, 0);
    });
    assert.equal(combinationSteps(four).length, 4);
    assert.match(combinationSelectionSummary(four, fourDone.draft), / \+ Трихопол$/);
  });

  it("сортирует варианты мастера по русскому алфавиту и не меняет порядок компонентов", () => {
    const order = components.map((item) => item.name);
    const trades = tradeItemsOf(components[1], "");
    const tradeOrder = trades.map(
      (item) => `${item.name_trade}|${item.standard_dose}|${item.standard_form}|${item.SMNN_code}`,
    );
    const sorted = sortedTradeChoices(trades);

    assert.deepEqual(
      sorted.map((choice) => `${choice.item.name_trade}|${choice.item.standard_dose}`),
      ["Амоксициллин|500 мг", "Флемоксин Солютаб|500 мг", "Флемоксин Солютаб|1000 мг"],
    );
    assert.equal(sorted.filter((choice) => choice.item.name_trade === "Флемоксин Солютаб").length, 2);
    assert.equal(sorted[0]?.sourceIndex, trades.findIndex((item) => item.name_trade === "Амоксициллин"));
    assert.equal(trades[sorted[0]?.sourceIndex ?? -1], sorted[0]?.item);

    const pantoprazole = tradeItemsOf(components[0], "ПАНТОПРАЗОЛ");
    const pantoprazoleSorted = sortedTradeChoices(pantoprazole);
    assert.deepEqual(
      pantoprazoleSorted.map((choice) => `${choice.item.name_trade}|${choice.item.standard_dose}|${choice.item.standard_form}`),
      ["Контролок|20 мг|ТАБЛЕТКИ", "Контролок|40 мг|ТАБЛЕТКИ", "Нольпаза|40 мг|ТАБЛЕТКИ"],
    );
    assert.notEqual(pantoprazoleSorted[0]?.item, pantoprazoleSorted[1]?.item);
    assert.equal(pantoprazoleSorted[0]?.item.standard_dose, "20 мг");
    assert.equal(pantoprazoleSorted[1]?.item.standard_dose, "40 мг");

    const unsorted: MedsCatalogComponent = {
      name: "Группа",
      type: "group",
      data: [
        { name: "ЯНТАРНАЯ", items: [] },
        { name: "АСКОРБИНОВАЯ", items: [] },
        { name: "БОРНАЯ", items: [] },
      ],
    };

    assert.deepEqual(innsOf(unsorted), ["ЯНТАРНАЯ", "АСКОРБИНОВАЯ", "БОРНАЯ"]);
    assert.deepEqual(sortedRuLabels(innsOf(unsorted)), ["АСКОРБИНОВАЯ", "БОРНАЯ", "ЯНТАРНАЯ"]);
    assert.deepEqual(components.map((item) => item.name), order);
    assert.deepEqual(
      trades.map((item) => `${item.name_trade}|${item.standard_dose}|${item.standard_form}|${item.SMNN_code}`),
      tradeOrder,
    );
  });
});

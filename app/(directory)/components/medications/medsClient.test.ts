import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMedsSelection,
  buildMedsRowView,
  listMedsDoses,
  listMedsForms,
  listMedsInns,
  listMedsTrades,
  matchMedsDrug,
  normalizeMedsName,
  readMedsCatalog,
  resolveMeds,
} from "./medsClient";
import { EMPTY_MEDS_SELECTION, type MedsCatalogDrug, type MedsRowSelection } from "./medsCatalogTypes";

const catalog = readMedsCatalog();
const drug = (name: string) => {
  const found = matchMedsDrug(catalog, name);
  assert.ok(found, name);
  return found;
};

const selection = (patch: Partial<MedsRowSelection> = {}): MedsRowSelection => ({
  ...EMPTY_MEDS_SELECTION,
  ...patch,
});

describe("meds catalog mock", () => {
  it("нормализует пробелы и регистр и не склеивает разные названия", () => {
    assert.equal(normalizeMedsName("  Кларитромицин   "), "кларитромицин");
    assert.equal(matchMedsDrug(catalog, "  кларитромицин ")?.name, "Кларитромицин");
    assert.equal(matchMedsDrug(catalog, "Ингибиторы  протонного   насоса")?.type, "group");
    assert.equal(matchMedsDrug(catalog, "Кларитромицин форте"), null);
    assert.equal(matchMedsDrug(catalog, "Ромашка"), null);
  });

  it("сохраняет порядок запроса и не выдумывает отсутствующие препараты", async () => {
    const resolved = await resolveMeds(["Левофлоксацин", "Нет такого", "Ребамипид", "Ребамипид"]);

    assert.deepEqual(
      resolved.drugs.map((item) => item.name),
      ["Левофлоксацин", "Ребамипид"],
    );
    assert.equal(resolved.interactions, null);
    assert.equal(catalog.drugs.length, 13);
  });

  it("для обычного препарата даёт торговые имена, дозы и формы без автовыбора", () => {
    const clarithromycin = drug("Кларитромицин");
    const view = buildMedsRowView(clarithromycin, EMPTY_MEDS_SELECTION);

    assert.equal(view.nameMenu?.mode, "drug");
    assert.deepEqual(view.nameMenu && "trades" in view.nameMenu ? view.nameMenu.trades : [], [
      "Клацид",
      "Фромилид",
    ]);
    assert.deepEqual(listMedsDoses(clarithromycin, EMPTY_MEDS_SELECTION), ["250 мг", "500 мг"]);
    assert.deepEqual(listMedsForms(clarithromycin, EMPTY_MEDS_SELECTION), ["ТАБЛЕТКИ"]);
    assert.equal(view.catalogLabel, "");

    const picked = applyMedsSelection(clarithromycin, EMPTY_MEDS_SELECTION, { trade: "Фромилид" });
    assert.equal(picked.trade, "Фромилид");
    assert.equal(picked.inn, "КЛАРИТРОМИЦИН");
    assert.equal(picked.dose, "");
    assert.equal(picked.form, "");
    assert.deepEqual(listMedsDoses(clarithromycin, picked), ["500 мг"]);
  });

  it("связывает дозу и форму с выбранным торговым именем", () => {
    const amoxicillin = drug("Амоксициллин");
    const flemoxin = selection({ trade: "Флемоксин Солютаб", inn: "АМОКСИЦИЛЛИН" });

    assert.deepEqual(listMedsDoses(amoxicillin, flemoxin), ["500 мг", "1000 мг"]);
    assert.deepEqual(listMedsForms(amoxicillin, flemoxin), ["ТАБЛЕТКИ ДИСПЕРГИРУЕМЫЕ"]);
    assert.deepEqual(
      listMedsDoses(amoxicillin, selection({ ...flemoxin, form: "ТАБЛЕТКИ ДИСПЕРГИРУЕМЫЕ" })),
      ["500 мг", "1000 мг"],
    );

    const capsules = selection({ trade: "Амоксициллин", inn: "АМОКСИЦИЛЛИН", form: "КАПСУЛЫ" });
    assert.deepEqual(listMedsDoses(amoxicillin, capsules), ["500 мг"]);

    const switched = applyMedsSelection(
      amoxicillin,
      selection({
        inn: "АМОКСИЦИЛЛИН",
        trade: "Флемоксин Солютаб",
        dose: "1000 мг",
        form: "ТАБЛЕТКИ ДИСПЕРГИРУЕМЫЕ",
      }),
      { trade: "Амоксициллин" },
    );
    assert.equal(switched.dose, "");
    assert.equal(switched.form, "");

    const manual = applyMedsSelection(
      amoxicillin,
      selection({
        inn: "АМОКСИЦИЛЛИН",
        trade: "Флемоксин Солютаб",
        dose: "по назначению",
        form: "свой раствор",
      }),
      { trade: "Амоксициллин" },
    );
    assert.equal(manual.dose, "по назначению");
    assert.equal(manual.form, "свой раствор");
  });

  it("для группы сначала требует МНН и не выбирает его само", () => {
    const inhibitors = drug("Ингибиторы протонного насоса");
    const closed = buildMedsRowView(inhibitors, EMPTY_MEDS_SELECTION);

    assert.equal(closed.nameMenu?.mode, "group");
    assert.deepEqual(listMedsInns(inhibitors), ["ОМЕПРАЗОЛ", "ПАНТОПРАЗОЛ", "ЭЗОМЕПРАЗОЛ"]);
    assert.deepEqual(listMedsTrades(inhibitors, ""), []);
    assert.deepEqual(listMedsDoses(inhibitors, EMPTY_MEDS_SELECTION), []);
    assert.equal(closed.catalogLabel, "");

    const omeprazole = applyMedsSelection(inhibitors, EMPTY_MEDS_SELECTION, { inn: "ОМЕПРАЗОЛ" });
    assert.equal(omeprazole.trade, "");
    assert.equal(omeprazole.dose, "");
    assert.deepEqual(listMedsTrades(inhibitors, omeprazole.inn), ["Омез", "Омепразол"]);
    assert.deepEqual(listMedsForms(inhibitors, omeprazole), ["КАПСУЛЫ"]);

    const withTrade = applyMedsSelection(inhibitors, omeprazole, { trade: "Омез" });
    assert.deepEqual(listMedsDoses(inhibitors, withTrade), ["20 мг"]);
    assert.equal(buildMedsRowView(inhibitors, withTrade).catalogLabel, "ОМЕПРАЗОЛ · Омез");

    const moved = applyMedsSelection(
      inhibitors,
      selection({
        inn: "ПАНТОПРАЗОЛ",
        trade: "Контролок",
        dose: "40 мг",
        form: "ТАБЛЕТКИ",
      }),
      { inn: "ОМЕПРАЗОЛ" },
    );
    assert.equal(moved.trade, "");
    assert.equal(moved.dose, "40 мг");
    assert.equal(moved.form, "");
  });

  it("не показывает торговые имена для type other", () => {
    for (const name of [
      "Стандартная тройная терапия",
      "Водорастворимый контрастный препарат (V08A Рентгеноконтрастные средства, содержащие йод)",
      "Штаммоспецифические пробиотики",
    ]) {
      const entry = drug(name);
      const view = buildMedsRowView(entry, EMPTY_MEDS_SELECTION);

      assert.equal(entry.type, "other");
      assert.equal(view.nameMenu, null);
      assert.deepEqual(view.doseOptions, []);
      assert.deepEqual(view.formOptions, []);
      assert.deepEqual(listMedsTrades(entry, entry.name), []);
    }
  });

  it("убирает повторы и пустые значения у остальных строк мока", () => {
    assert.deepEqual(listMedsTrades(drug("Ребамипид"), ""), ["Ребагит", "Ребамипид"]);
    assert.deepEqual(listMedsDoses(drug("Ребамипид"), EMPTY_MEDS_SELECTION), ["100 мг"]);
    assert.deepEqual(listMedsTrades(drug("Метронидазол"), ""), ["Трихопол", "Метронидазол"]);
    assert.deepEqual(listMedsDoses(drug("Метронидазол"), selection({ trade: "Трихопол" })), ["250 мг"]);
    assert.deepEqual(listMedsTrades(drug("Левофлоксацин"), ""), ["Таваник", "Левофлоксацин"]);
    assert.deepEqual(listMedsInns(drug("Блокаторы H2-гистаминовых рецепторов")), ["ФАМОТИДИН"]);
    assert.deepEqual(listMedsTrades(drug("Блокаторы H2-гистаминовых рецепторов"), "ФАМОТИДИН"), [
      "Квамател",
      "Фамотидин",
    ]);
    assert.deepEqual(listMedsDoses(drug("Висмута трикалия дицитрат"), EMPTY_MEDS_SELECTION), ["120 мг"]);
    assert.deepEqual(listMedsDoses(drug("Тетрациклин"), EMPTY_MEDS_SELECTION), ["100 мг", "250 мг"]);

    const potassium = drug("Калий-конкурентный ингибитор протонной помпы");
    const inns = listMedsInns(potassium);
    assert.equal(inns.length, 1);
    assert.deepEqual(listMedsTrades(potassium, inns[0]), ["Тестовый бренд — вонопразан"]);
    assert.deepEqual(listMedsDoses(potassium, selection({ inn: inns[0], trade: "Тестовый бренд — вонопразан" })), [
      "10 мг",
      "20 мг",
    ]);
  });

  it("записывает код справочника только когда выбрана ровно одна запись и код непустой", () => {
    const sample: MedsCatalogDrug = {
      name: "Пример",
      type: "drug",
      data: [
        {
          name: "ПРИМЕР",
          items: [
            {
              standard_MNN: "ПРИМЕР",
              SMNN_code: "code-20",
              standard_form: "ТАБЛЕТКИ",
              standard_dose: "20 мг",
              name_trade: "Бренд",
              code_ATC: "",
              name_unit: "",
            },
            {
              standard_MNN: "ПРИМЕР",
              SMNN_code: "code-40",
              standard_form: "ТАБЛЕТКИ",
              standard_dose: "40 мг",
              name_trade: "Бренд",
              code_ATC: "",
              name_unit: "",
            },
          ],
        },
      ],
    };

    const partial = applyMedsSelection(sample, EMPTY_MEDS_SELECTION, { trade: "Бренд" });
    assert.equal(partial.recordId, "");

    const exact = applyMedsSelection(sample, partial, { dose: "20 мг", form: "ТАБЛЕТКИ" });
    assert.equal(exact.recordId, "code-20");

    const fromMock = applyMedsSelection(drug("Кларитромицин"), selection({
      inn: "КЛАРИТРОМИЦИН",
      trade: "Клацид",
      dose: "250 мг",
      form: "ТАБЛЕТКИ",
    }), {});
    assert.equal(fromMock.recordId, "");
  });
});

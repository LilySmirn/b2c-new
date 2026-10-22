import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sourceCatalog from "../../../../design/cart/meds-mock-cart-v5.json";
import {
  applyMedsSelection,
  buildMedsRowView,
  listMedsDoses,
  listMedsForms,
  listMedsInns,
  listMedsTrades,
  matchMedsDrug,
  matchMedsDrugForItem,
  normalizeMedsName,
  resolveMeds,
} from "./medsClient";
import { readMedsCatalog } from "./medsMockCatalog";
import { EMPTY_MEDS_SELECTION, type MedsCatalogDrug, type MedsCatalogItemRecord, type MedsRowSelection } from "./medsCatalogTypes";

const sourceNames = sourceCatalog.drugs.map((drug) => drug.name);
const catalog = readMedsCatalog(sourceNames);
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

  it("сохраняет порядок, повторы и отвечает other на неизвестное название", async () => {
    const resolved = await resolveMeds(["Левофлоксацин", "Нет такого", "Ребамипид", "Ребамипид"], {
      source: "mock",
    });

    assert.deepEqual(
      resolved.drugs.map((item) => item.name),
      ["Левофлоксацин", "Нет такого", "Ребамипид", "Ребамипид"],
    );
    assert.equal(resolved.drugs[1]?.type, "other");
    assert.equal(resolved.interactions, null);
    assert.notEqual(resolved.drugs[2], resolved.drugs[3]);
    assert.equal(sourceNames.length, 14);
    assert.equal(catalog.drugs.length, 14);

    if (resolved.drugs[1]?.type !== "other") return;

    const item = resolved.drugs[1].data[0]?.items[0];
    assert.equal(item?.standard_MNN, "Нет такого");
    assert.equal(item?.SMNN_code, "");
    assert.equal(item?.standard_form, "");
    assert.equal(item?.standard_dose, "");
    assert.equal(item?.name_trade, "");
    assert.equal(item?.code_ATC, "");
    assert.equal(item?.name_unit, "");
  });

  it("на пустой массив возвращает пустой ответ", async () => {
    assert.deepEqual(await resolveMeds([], { source: "mock" }), { drugs: [], interactions: null });
    assert.deepEqual(readMedsCatalog(), { drugs: [], interactions: null });
  });

  it("отдаёт записи мока в порядке запроса и не подменяет имя строки", async () => {
    const resolved = await resolveMeds(sourceNames, { source: "mock" });

    resolved.drugs.forEach((drug, index) => {
      assert.equal(drug.name, sourceNames[index]);
      assert.equal(drug.type, sourceCatalog.drugs[index]?.type);
    });

    const spaced = await resolveMeds(["  Кларитромицин  "], { source: "mock" });
    assert.equal(spaced.drugs[0]?.name, "  Кларитромицин  ");
    assert.equal(spaced.drugs[0]?.type, "drug");
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
      if (entry.type !== "other") continue;
      const item = entry.data[0]?.items[0];
      assert.equal(item?.name_trade, "");
      assert.equal(item?.standard_dose, "");
      assert.equal(item?.standard_form, "");
      assert.equal(item?.SMNN_code, "");
    }
  });

  it("убирает повторы и пустые значения у остальных строк мока", () => {
    assert.deepEqual(listMedsTrades(drug("Ребамипид"), ""), ["Ребагит", "Ребамипид"]);
    assert.deepEqual(listMedsDoses(drug("Ребамипид"), EMPTY_MEDS_SELECTION), ["100 мг"]);
    assert.deepEqual(listMedsTrades(drug("Метронидазол"), ""), ["Метронидазол", "Трихопол"]);
    assert.deepEqual(listMedsDoses(drug("Метронидазол"), selection({ trade: "Трихопол" })), ["250 мг"]);
    assert.deepEqual(listMedsTrades(drug("Левофлоксацин"), ""), ["Левофлоксацин", "Таваник"]);
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

  it("читает combination_data и не превращает комбинацию в один препарат", () => {
    const combo = drug("Омепразол + фактор VIII + Ромашка");
    assert.equal(combo.type, "combination");
    assert.equal("data" in combo, false);
    if (combo.type !== "combination") return;

    assert.deepEqual(
      combo.combination_data.map((item) => item.type),
      ["drug", "group", "other"],
    );
    assert.equal(combo.combination_data[0]?.data[0]?.items[0]?.name_trade, "Омепразол");
    assert.equal(combo.combination_data[1]?.type, "group");
    assert.equal(combo.combination_data[1]?.data[0]?.name, "ОКТОКОГ АЛЬФА");
    assert.equal(combo.combination_data[2]?.data[0]?.items[0]?.name_trade, "");
    assert.equal(combo.combination_data[2]?.data[0]?.items[0]?.standard_dose, "");
    assert.equal(combo.combination_data[2]?.data[0]?.items[0]?.SMNN_code, "");

    const view = buildMedsRowView(combo, EMPTY_MEDS_SELECTION);
    assert.equal(view.nameMenu, null);
    assert.deepEqual(view.doseOptions, []);
    assert.deepEqual(view.formOptions, []);

    const manual = applyMedsSelection(combo, EMPTY_MEDS_SELECTION, { dose: "5 мг", form: "капли" });
    assert.equal(manual.dose, "5 мг");
    assert.equal(manual.form, "капли");
    assert.equal(manual.recordId, "");
  });

  it("связывает повтор с нужной позицией ответа, а не с первым таким названием", () => {
    const resolved = readMedsCatalog(["Ребамипид", "Кларитромицин", "Ребамипид"]);
    const second = matchMedsDrugForItem(
      resolved,
      {
        ids: ["row-1", "row-2", "row-3"],
        names: ["Ребамипид", "Кларитромицин", "Ребамипид"],
      },
      { id: "row-3", title: "Ребамипид", sourceIds: ["row-3"] },
    );

    assert.equal(second, resolved.drugs[2]);
    assert.equal(second?.type, "drug");
    assert.notEqual(second, resolved.drugs[0]);
  });

  it("сортирует МНН и торговые названия по русскому алфавиту и не меняет каталог", () => {
    const record = (trade: string): MedsCatalogItemRecord => ({
      standard_MNN: "МНН",
      SMNN_code: trade,
      standard_form: "",
      standard_dose: "",
      name_trade: trade,
      code_ATC: "",
      name_unit: "",
    });
    const group: MedsCatalogDrug = {
      name: "Смешанная группа",
      type: "group",
      data: [
        { name: "ЯНТАРНАЯ КИСЛОТА", items: [record("Янтовин")] },
        { name: "аскорбиновая кислота", items: [record("Асковит")] },
        { name: "БОРНАЯ КИСЛОТА", items: [record("Борная"), record("Борная мазь")] },
      ],
    };
    const names = group.data.map((entry) => entry.name);
    const boronTrades = group.data[2]?.items.map((item) => item.name_trade);

    assert.deepEqual(listMedsInns(group), [
      "аскорбиновая кислота",
      "БОРНАЯ КИСЛОТА",
      "ЯНТАРНАЯ КИСЛОТА",
    ]);
    assert.deepEqual(listMedsTrades(group, "БОРНАЯ КИСЛОТА"), ["Борная", "Борная мазь"]);
    assert.deepEqual(group.data.map((entry) => entry.name), names);
    assert.deepEqual(group.data[2]?.items.map((item) => item.name_trade), boronTrades);

    const medicine: MedsCatalogDrug = {
      name: "Препарат",
      type: "drug",
      data: [
        {
          name: "МНН",
          items: [record("Янтовин"), record("амоксициллин"), record("Борная")],
        },
      ],
    };
    const trades = medicine.data[0]?.items.map((item) => item.name_trade);

    assert.deepEqual(listMedsTrades(medicine, ""), ["амоксициллин", "Борная", "Янтовин"]);
    assert.deepEqual(medicine.data[0]?.items.map((item) => item.name_trade), trades);
    assert.notDeepEqual(
      [...(trades ?? [])].sort(),
      ["амоксициллин", "Борная", "Янтовин"],
    );
  });
});

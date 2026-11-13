import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChecklistSection } from "@/app/(directory)/components/checklistModel";
import type { MedsCatalogResponse } from "@/app/(directory)/components/medications/medsCatalogTypes";
import {
  adaptDirectoryCartToMiniCart,
  miniCartComponentId,
  MINI_CART_DRUGS_TAB_ID,
  parseMiniCartComponentIndex,
} from "./fromDirectoryCart";

const sections: ChecklistSection[] = [
  {
    id: "sec-req",
    title: "Лабораторные исследования",
    categoryId: "required-diagnostics",
    groupTitle: "Диагностика обязательная",
    items: [
      {
        id: "lab-1",
        checked: false,
        qualityControl: true,
        code: "A1",
        title: "Общий анализ крови",
        info: "Базовый анализ",
        comment: "",
      },
    ],
  },
  {
    id: "sec-meds",
    title: "Медикаментозное лечение",
    categoryId: "medications",
    groupTitle: "Препараты",
    items: [
      {
        id: "med-drug",
        checked: false,
        qualityControl: true,
        code: "A1",
        title: "Омепразол",
        info: "ИПН",
        comment: "",
        treatmentPlan: "1 раз в сутки",
        treatmentDuration: "14 дней",
      },
      {
        id: "med-group",
        checked: false,
        qualityControl: false,
        code: "B2",
        title: "Ингибиторы протонного насоса",
        info: "Группа",
        comment: "",
      },
      {
        id: "med-other",
        checked: false,
        qualityControl: false,
        code: "",
        title: "Прочее средство",
        info: "",
        comment: "",
      },
      {
        id: "med-combo",
        checked: false,
        qualityControl: true,
        code: "A1",
        title: "Омепразол++Амоксициллин",
        info: "Схема",
        comment: "",
      },
    ],
  },
];

const catalog: MedsCatalogResponse = {
  interactions: null,
  drugs: [
    {
      name: "Омепразол",
      type: "drug",
      data: [
        {
          name: "ОМЕПРАЗОЛ",
          items: [
            {
              standard_MNN: "ОМЕПРАЗОЛ",
              SMNN_code: "smnn-1",
              standard_form: "КАПСУЛЫ",
              standard_dose: "20 мг",
              name_trade: "Омез",
              code_ATC: "A02BC01",
              name_unit: "шт",
            },
          ],
        },
      ],
    },
    {
      name: "Ингибиторы протонного насоса",
      type: "group",
      data: [
        {
          name: "ОМЕПРАЗОЛ",
          items: [
            {
              standard_MNN: "ОМЕПРАЗОЛ",
              SMNN_code: "smnn-2",
              standard_form: "КАПСУЛЫ",
              standard_dose: "20 мг",
              name_trade: "Омез",
              code_ATC: "A02BC01",
              name_unit: "шт",
            },
          ],
        },
        {
          name: "ПАНТОПРАЗОЛ",
          items: [
            {
              standard_MNN: "ПАНТОПРАЗОЛ",
              SMNN_code: "smnn-3",
              standard_form: "ТАБЛЕТКИ",
              standard_dose: "40 мг",
              name_trade: "Контролок",
              code_ATC: "A02BC02",
              name_unit: "шт",
            },
          ],
        },
      ],
    },
    {
      name: "Прочее средство",
      type: "other",
      data: [],
    },
    {
      name: "Омепразол++Амоксициллин",
      type: "combination",
      combination_data: [
        {
          name: "Омепразол",
          type: "drug",
          data: [
            {
              name: "ОМЕПРАЗОЛ",
              items: [
                {
                  standard_MNN: "ОМЕПРАЗОЛ",
                  SMNN_code: "smnn-4",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "20 мг",
                  name_trade: "Омез",
                  code_ATC: "A02BC01",
                  name_unit: "шт",
                },
              ],
            },
          ],
        },
        {
          name: "Амоксициллин",
          type: "drug",
          data: [
            {
              name: "АМОКСИЦИЛЛИН",
              items: [
                {
                  standard_MNN: "АМОКСИЦИЛЛИН",
                  SMNN_code: "smnn-5",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "500 мг",
                  name_trade: "Флемоксин",
                  code_ATC: "J01CA04",
                  name_unit: "шт",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("adaptDirectoryCartToMiniCart", () => {
  it("maps sections, drug kinds and trades from production catalog", () => {
    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "K26: Язвенная болезнь",
      sections,
      catalog,
      catalogQuery: {
        ids: ["med-drug", "med-group", "med-other", "med-combo"],
        names: [
          "Омепразол",
          "Ингибиторы протонного насоса",
          "Прочее средство",
          "Омепразол++Амоксициллин",
        ],
      },
      appendixA3Tables: [{ name: "Таблица 1", html: "<table></table>", comment: "Комментарий" }],
    });

    assert.equal(view.diagnosis, "K26: Язвенная болезнь");
    assert.equal(view.tabs.find((tab) => tab.id === MINI_CART_DRUGS_TAB_ID)?.active, true);
    assert.equal(view.tabs.find((tab) => tab.id === "required-diagnostics")?.enabled, true);
    assert.equal(view.tabs.find((tab) => tab.id === "appendix-a3")?.enabled, true);

    const byId = new Map(view.drugItems.map((item) => [item.id, item]));
    assert.equal(byId.get("med-drug")?.kind, "trade");
    assert.equal(byId.get("med-group")?.kind, "alternatives");
    assert.equal(byId.get("med-other")?.kind, "plain");
    assert.equal(byId.get("med-combo")?.kind, "scheme");
    assert.equal(byId.get("med-combo")?.components?.length, 2);
    assert.equal(byId.get("med-drug")?.scheme, "1 раз в сутки");
    assert.equal(byId.get("med-drug")?.course, "14 дней");

    assert.equal(view.schemeByItemId["med-combo"]?.components.length, 2);
    assert.equal(view.schemeByItemId["med-combo"]?.confirmed, null);
    assert.equal(view.schemeByItemId["med-group"], undefined);

    assert.ok(view.trades["ОМЕПРАЗОЛ"]?.trades?.some((row) => row.trade === "Омез"));
    assert.ok(view.shellTabs["required-diagnostics"]?.groups?.[0]?.items?.[0]?.name);
    assert.equal(
      view.shellTabs["appendix-a3"]?.groups?.[0]?.items?.[0]?.name,
      "Таблица 1",
    );
    assert.equal(view.recommendation, "");
  });

  it("keeps scheme component ids index-stable and maps group components", () => {
    assert.equal(miniCartComponentId("med-x", 0), "med-x__comp__0");
    assert.equal(parseMiniCartComponentIndex("med-x", "med-x__comp__2"), 2);
    assert.equal(parseMiniCartComponentIndex("med-x", "med-y__comp__0"), null);
    assert.equal(parseMiniCartComponentIndex("med-x", "med-x__comp__a"), null);

    const richCatalog: MedsCatalogResponse = {
      interactions: null,
      drugs: [
        {
          name: "Тройная схема",
          type: "combination",
          combination_data: [
            {
              name: "ИПН",
              type: "group",
              data: [
                {
                  name: "ОМЕПРАЗОЛ",
                  items: [
                    {
                      standard_MNN: "ОМЕПРАЗОЛ",
                      SMNN_code: "smnn-g1",
                      standard_form: "КАПСУЛЫ",
                      standard_dose: "20 мг",
                      name_trade: "Омез",
                      code_ATC: "A02BC01",
                      name_unit: "шт",
                    },
                  ],
                },
                {
                  name: "ПАНТОПРАЗОЛ",
                  items: [
                    {
                      standard_MNN: "ПАНТОПРАЗОЛ",
                      SMNN_code: "smnn-g2",
                      standard_form: "ТАБЛЕТКИ",
                      standard_dose: "40 мг",
                      name_trade: "Контролок",
                      code_ATC: "A02BC02",
                      name_unit: "шт",
                    },
                  ],
                },
              ],
            },
            {
              name: "Амоксициллин",
              type: "drug",
              data: [
                {
                  name: "АМОКСИЦИЛЛИН",
                  items: [
                    {
                      standard_MNN: "АМОКСИЦИЛЛИН",
                      SMNN_code: "smnn-d1",
                      standard_form: "КАПСУЛЫ",
                      standard_dose: "500 мг",
                      name_trade: "Флемоксин",
                      code_ATC: "J01CA04",
                      name_unit: "шт",
                    },
                  ],
                },
              ],
            },
            {
              name: "Прочее в схеме",
              type: "other",
              data: [{ name: "Уточнение", items: [] }],
            },
          ],
        },
      ],
    };

    const richSections: ChecklistSection[] = [
      {
        id: "sec-rich",
        title: "Медикаментозное лечение",
        categoryId: "medications",
        groupTitle: "Препараты",
        items: [
          {
            id: "med-triple",
            checked: false,
            qualityControl: true,
            code: "A1",
            title: "Тройная схема",
            info: "",
            comment: "",
          },
        ],
      },
    ];

    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "Схема",
      sections: richSections,
      catalog: richCatalog,
      catalogQuery: { ids: ["med-triple"], names: ["Тройная схема"] },
      assignment: {
        medicationDrafts: {},
        medicationIntake: {},
        combinations: {
          "med-triple": {
            picks: [
              {
                inn: "ОМЕПРАЗОЛ",
                confirmed: true,
                item: {
                  standard_MNN: "ОМЕПРАЗОЛ",
                  SMNN_code: "smnn-g1",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "20 мг",
                  name_trade: "Омез",
                  code_ATC: "A02BC01",
                  name_unit: "шт",
                },
              },
              {
                inn: "АМОКСИЦИЛЛИН",
                confirmed: true,
                item: {
                  standard_MNN: "АМОКСИЦИЛЛИН",
                  SMNN_code: "smnn-d1",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "500 мг",
                  name_trade: "Флемоксин",
                  code_ATC: "J01CA04",
                  name_unit: "шт",
                },
              },
              {
                inn: "",
                confirmed: true,
                item: null,
              },
            ],
          },
        },
        itemStates: {},
      },
    });

    const scheme = view.drugItems[0];
    assert.equal(scheme?.kind, "scheme");
    assert.equal(scheme?.components?.length, 3);
    assert.equal(scheme?.components?.[0]?.kind, "alternatives");
    assert.equal(scheme?.components?.[2]?.kind, "plain");
    assert.equal(
      parseMiniCartComponentIndex("med-triple", scheme?.components?.[1]?.id ?? ""),
      1,
    );
    assert.equal(
      view.schemeByItemId["med-triple"]?.components[0]?.type,
      "group",
    );
    assert.equal(view.schemeByItemId["med-triple"]?.confirmed?.picks.length, 3);
    assert.equal(
      scheme?.componentPicks?.[miniCartComponentId("med-triple", 0)]?.trade,
      "Омез",
    );
    assert.equal(
      scheme?.componentPicks?.[miniCartComponentId("med-triple", 2)]?.trade,
      "",
    );
  });

  it("applies assignment snapshot drafts, combinations and custom extras", () => {
    const omeprazoleItem = catalog.drugs[0];
    assert.equal(omeprazoleItem?.type, "drug");
    const amoxComponent =
      catalog.drugs[3]?.type === "combination"
        ? catalog.drugs[3].combination_data[1]
        : null;
    assert.ok(amoxComponent && amoxComponent.type === "drug");

    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "K26: Язвенная болезнь",
      sections,
      catalog,
      catalogQuery: {
        ids: ["med-drug", "med-group", "med-other", "med-combo"],
        names: [
          "Омепразол",
          "Ингибиторы протонного насоса",
          "Прочее средство",
          "Омепразол++Амоксициллин",
        ],
      },
      assignment: {
        medicationDrafts: {
          "med-drug": {
            inn: "ОМЕПРАЗОЛ",
            trade: "Омез",
            dose: "40 мг",
            form: "КАПСУЛЫ",
            scheme: "2 раза в сутки",
            course: "7 дней",
          },
        },
        medicationIntake: {},
        combinations: {
          "med-combo": {
            picks: [
              {
                inn: "ОМЕПРАЗОЛ",
                confirmed: true,
                item: {
                  standard_MNN: "ОМЕПРАЗОЛ",
                  SMNN_code: "smnn-4",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "20 мг",
                  name_trade: "Омез",
                  code_ATC: "A02BC01",
                  name_unit: "шт",
                },
              },
              {
                inn: "АМОКСИЦИЛЛИН",
                confirmed: true,
                item: {
                  standard_MNN: "АМОКСИЦИЛЛИН",
                  SMNN_code: "smnn-5",
                  standard_form: "КАПСУЛЫ",
                  standard_dose: "500 мг",
                  name_trade: "Флемоксин",
                  code_ATC: "J01CA04",
                  name_unit: "шт",
                },
              },
            ],
          },
        },
        itemStates: {
          "lab-1": { checked: true, comment: "обязательно" },
          "med-drug": { checked: true, comment: "по схеме" },
          "med-combo": { checked: true, comment: "" },
        },
        commentSources: {
          "med-drug": "user",
        },
      },
      customItems: [
        { id: "custom-1", name: "Доп. препарат", comment: "вне КР" },
      ],
      generalRecommendation: "Контроль через 2 недели",
    });

    const byId = new Map(view.drugItems.map((item) => [item.id, item]));
    assert.equal(byId.get("med-drug")?.selected, true);
    assert.equal(byId.get("med-drug")?.selectedTrade, "Омез");
    assert.equal(byId.get("med-drug")?.selectedDose, "40 мг");
    assert.equal(byId.get("med-drug")?.selectedForm, "КАПСУЛЫ");
    assert.equal(byId.get("med-drug")?.scheme, "2 раза в сутки");
    assert.equal(byId.get("med-drug")?.course, "7 дней");
    assert.equal(byId.get("med-drug")?.commentShort, "по схеме");

    const scheme = byId.get("med-combo");
    assert.equal(scheme?.kind, "scheme");
    assert.equal(scheme?.selectedTrade, "Омез + Флемоксин");
    assert.equal(scheme?.componentPicks?.["med-combo__comp__0"]?.trade, "Омез");
    assert.equal(scheme?.componentPicks?.["med-combo__comp__1"]?.dose, "500 мг");
    assert.equal(scheme?.components?.[0]?.id, "med-combo__comp__0");
    assert.equal(view.schemeByItemId["med-combo"]?.confirmed?.picks[0]?.item?.name_trade, "Омез");
    assert.equal(view.schemeByItemId["med-combo"]?.components.length, 2);

    const lab = view.shellTabs["required-diagnostics"]?.groups?.[0]?.items?.[0];
    assert.equal(lab?.selected, true);
    assert.equal(lab?.comment, "обязательно");

    const customGroup = view.shellTabs.lifestyle?.groups?.find(
      (group) => group.title === "Прочее",
    );
    assert.equal(customGroup?.items?.[0]?.name, "Доп. препарат");
    assert.equal(customGroup?.items?.[0]?.selected, true);
    assert.equal(view.tabs.find((tab) => tab.id === "lifestyle")?.enabled, true);
    assert.equal(view.recommendation, "Контроль через 2 недели");
  });
});

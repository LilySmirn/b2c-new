import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chooseCombinationInn,
  chooseCombinationTrade,
  combinationComponents,
  combinationDrugCount,
  combinationSchemeRow,
  combinationSteps,
  commitCombinationDraft,
  confirmCombinationOther,
  createCombinationWizard,
  innsOf,
  schemeBadgeText,
} from "./combinationSelection";
import { showsSchemeComposition } from "./assignmentScheme";
import { collectMedicationQuery } from "./medicationQuery";
import {
  listMedsTrades,
  matchMedsDrugForItem,
  MEDS_RESOLVE_PATH,
  MedsResolveError,
  resolveMeds,
} from "./medsClient";
import type { MedsCatalogComponent, MedsCatalogItemRecord, MedsCatalogResponse } from "./medsCatalogTypes";
import { mockCatalogReads } from "./medsMockCatalog";
import { readMedsSource } from "./medsSource";

const PLUS_PLUS = "Омепразол++Амоксициллин++Кларитромицин";

const item = (patch: Partial<MedsCatalogItemRecord> = {}): MedsCatalogItemRecord => ({
  standard_MNN: "",
  SMNN_code: "",
  standard_form: "",
  standard_dose: "",
  name_trade: "",
  code_ATC: "",
  name_unit: "",
  ...patch,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const catalogResponse = (drugs: MedsCatalogResponse["drugs"]) =>
  jsonResponse({ drugs, interactions: null });

const withEnv = async (value: string | undefined, run: () => Promise<void> | void) => {
  const previous = process.env.NEXT_PUBLIC_MEDS_SOURCE;
  if (value === undefined) delete process.env.NEXT_PUBLIC_MEDS_SOURCE;
  else process.env.NEXT_PUBLIC_MEDS_SOURCE = value;

  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_MEDS_SOURCE;
    else process.env.NEXT_PUBLIC_MEDS_SOURCE = previous;
  }
};

describe("resolveMeds real API", () => {
  it("по умолчанию использует real и не принимает постороннее значение как mock", async () => {
    await withEnv(undefined, () => {
      assert.equal(readMedsSource(), "real");
    });
    await withEnv("real", () => {
      assert.equal(readMedsSource(), "real");
    });
    await withEnv(" mock ", () => {
      assert.equal(readMedsSource(), "mock");
    });
    await withEnv("fallback", () => {
      assert.equal(readMedsSource(), "real");
    });
  });

  it("отправляет POST с исходным массивом и не разбивает строку с ++", async () => {
    const names = ["Омепразол", "Амоксициллин", "Кларитромицин", PLUS_PLUS, ""];
    let method = "";
    let url = "";
    let body = "";

    const resolved = await resolveMeds(names, {
      source: "real",
      fetchImpl: async (input, init) => {
        method = init?.method ?? "";
        url = String(input);
        body = String(init?.body ?? "");
        return catalogResponse(
          names.map((name) => ({
            name,
            type: "other",
            data: [{ name, items: [item({ standard_MNN: name })] }],
          })),
        );
      },
    });

    assert.equal(method, "POST");
    assert.equal(url, MEDS_RESOLVE_PATH);
    assert.deepEqual(JSON.parse(body), names);
    assert.equal(body.includes("Стандартная тройная терапия"), false);
    assert.equal(resolved.drugs.map((drug) => drug.name).join("|"), names.join("|"));
    assert.equal(resolved.drugs[3]?.type, "other");
    assert.equal(resolved.interactions, null);
  });

  it("читает drug, group и other и не дописывает моковые торговые названия", async () => {
    const resolved = await resolveMeds(["Кларитромицин", "Ингибиторы протонного насоса", "Ромашка"], {
      source: "real",
      fetchImpl: async () =>
        catalogResponse([
          {
            name: "Кларитромицин",
            type: "drug",
            data: [
              {
                name: "Кларитромицин",
                items: [
                  item({
                    standard_MNN: "КЛАРИТРОМИЦИН",
                    SMNN_code: "code-1",
                    standard_form: "ТАБЛЕТКИ",
                    standard_dose: "500 мг",
                    name_trade: "Только с сервера",
                    code_ATC: "J01FA09",
                    name_unit: "шт.",
                  }),
                  item({ standard_MNN: "КЛАРИТРОМИЦИН" }),
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
                items: [item({ standard_MNN: "ОМЕПРАЗОЛ", name_trade: "Омез" })],
              },
              {
                name: "ПАНТОПРАЗОЛ",
                items: [item({ standard_MNN: "ПАНТОПРАЗОЛ", name_trade: "Контролок" })],
              },
            ],
          },
          {
            name: "Ромашка",
            type: "other",
            data: [{ name: "Ромашка", items: [item({ standard_MNN: "Ромашка" })] }],
          },
        ]),
    });

    assert.deepEqual(
      resolved.drugs.map((drug) => drug.type),
      ["drug", "group", "other"],
    );
    assert.equal(resolved.drugs[0]?.type === "drug" && resolved.drugs[0].data[0]?.items[1]?.name_trade, "");
    assert.equal(resolved.drugs[0]?.type === "drug" && resolved.drugs[0].data[0]?.items[1]?.SMNN_code, "");
    assert.deepEqual(listMedsTrades(resolved.drugs[0] ?? null, ""), ["Только с сервера"]);
    assert.equal(resolved.drugs[1]?.type, "group");
    if (resolved.drugs[1]?.type === "group") {
      assert.deepEqual(
        resolved.drugs[1].data.map((group) => group.name),
        ["ОМЕПРАЗОЛ", "ПАНТОПРАЗОЛ"],
      );
    }
    assert.equal(resolved.drugs[2]?.type, "other");
  });

  it("принимает будущий ответ combination и сохраняет имя с ++", async () => {
    const resolved = await resolveMeds([PLUS_PLUS], {
      source: "real",
      fetchImpl: async (_input, init) => {
        assert.deepEqual(JSON.parse(String(init?.body)), [PLUS_PLUS]);
        return catalogResponse([
          {
            name: PLUS_PLUS,
            type: "combination",
            combination_data: [
              {
                name: "ОМЕПРАЗОЛ",
                type: "drug",
                data: [{ name: "ОМЕПРАЗОЛ", items: [item({ standard_MNN: "ОМЕПРАЗОЛ", name_trade: "Омез" })] }],
              },
              {
                name: "АМОКСИЦИЛЛИН",
                type: "drug",
                data: [{ name: "АМОКСИЦИЛЛИН", items: [item({ standard_MNN: "АМОКСИЦИЛЛИН" })] }],
              },
              {
                name: "КЛАРИТРОМИЦИН",
                type: "drug",
                data: [{ name: "КЛАРИТРОМИЦИН", items: [item({ standard_MNN: "КЛАРИТРОМИЦИН" })] }],
              },
            ],
          },
        ]);
      },
    });

    const entry = resolved.drugs[0];
    assert.equal(entry?.name, PLUS_PLUS);
    assert.equal(entry?.type, "combination");
    assert.equal(entry !== undefined && "data" in entry, false);
    if (entry?.type !== "combination") return;

    assert.deepEqual(
      combinationSteps(entry.combination_data).map((step) => step.name),
      ["ОМЕПРАЗОЛ", "АМОКСИЦИЛЛИН", "КЛАРИТРОМИЦИН"],
    );
  });

  it("переключается между real и mock и не подменяет ошибку сервера моком", async () => {
    await withEnv("mock", async () => {
      let called = false;
      const mock = await resolveMeds(["Стандартная тройная терапия"], {
        fetchImpl: async () => {
          called = true;
          throw new Error("network");
        },
      });

      assert.equal(called, false);
      assert.equal(mock.drugs[0]?.type, "combination");
      if (mock.drugs[0]?.type !== "combination") return;
      assert.deepEqual(
        combinationSteps(combinationComponents(mock.drugs[0])).map((step) => step.name),
        ["Ингибиторы протонного насоса", "Амоксициллин", "Кларитромицин"],
      );
    });

    const unchanged = await resolveMeds([PLUS_PLUS], { source: "mock" });
    assert.equal(unchanged.drugs[0]?.name, PLUS_PLUS);
    assert.equal(unchanged.drugs[0]?.type, "other");

    await assert.rejects(
      () =>
        resolveMeds(["Стандартная тройная терапия"], {
          source: "real",
          fetchImpl: async () => {
            throw new TypeError("Failed to fetch");
          },
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "network",
    );
  });

  it("проносит название с ++ от клинической рекомендации до тела запроса", async () => {
    const query = collectMedicationQuery([
      {
        categoryId: "medications",
        items: [{ id: "scheme-1", title: PLUS_PLUS }],
      },
    ]);
    let body = "";

    await resolveMeds(query.names, {
      source: "real",
      fetchImpl: async (_input, init) => {
        body = String(init?.body ?? "");
        return catalogResponse([
          {
            name: PLUS_PLUS,
            type: "drug",
            data: [{ name: "ОМЕПРАЗОЛ", items: [item({ standard_MNN: "ОМЕПРАЗОЛ" })] }],
          },
        ]);
      },
    });

    assert.deepEqual(query.names, [PLUS_PLUS]);
    assert.equal(body, JSON.stringify([PLUS_PLUS]));
  });

  it("отклоняет HTTP-ошибку, некорректный JSON, чужой тип и пустой список", async () => {
    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () => jsonResponse({ error: "Meds catalog request failed" }, 502),
        }),
      (error: unknown) =>
        error instanceof MedsResolveError && error.reason === "http" && error.status === 502,
    );

    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () => new Response("not-json", { status: 200 }),
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "invalid-json",
    );

    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () =>
            jsonResponse({
              drugs: [{ name: "Омепразол", type: "combo", data: [] }],
              interactions: null,
            }),
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "invalid-shape",
    );

    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () => jsonResponse({ drugs: [], interactions: null }),
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "invalid-shape",
    );

    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () => jsonResponse({ drugs: [], interactions: [] }),
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "invalid-shape",
    );

    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    await assert.rejects(
      () =>
        resolveMeds(["Омепразол"], {
          source: "real",
          fetchImpl: async () => {
            throw timeout;
          },
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "timeout",
    );
  });
});

const other = (name: string) => ({
  name,
  type: "other" as const,
  data: [{ name, items: [item({ standard_MNN: name })] }],
});

const drugEntry = (name: string, trade: string) => ({
  name,
  type: "drug" as const,
  data: [
    {
      name,
      items: [
        item({
          standard_MNN: name,
          SMNN_code: `code-${name}`,
          standard_form: "КАПСУЛЫ",
          standard_dose: "20 мг",
          name_trade: trade,
          code_ATC: "A02BC01",
          name_unit: "шт. (капсула)",
        }),
      ],
    },
  ],
});

const groupEntry = (name: string, inn: string, trade: string): MedsCatalogComponent => ({
  name,
  type: "group",
  data: [
    {
      name: inn,
      items: [
        item({
          standard_MNN: inn,
          SMNN_code: `code-${inn}`,
          standard_form: "ЛИОФИЛИЗАТ ДЛЯ ПРИГОТОВЛЕНИЯ РАСТВОРА ДЛЯ ВНУТРИВЕННОГО ВВЕДЕНИЯ",
          standard_dose: "500 МЕ",
          name_trade: trade,
          code_ATC: "B02BD02",
          name_unit: "МЕ",
        }),
      ],
    },
  ],
});

const otherComponent = (name: string): MedsCatalogComponent => ({
  name,
  type: "other",
  data: [{ name, items: [item({ standard_MNN: name })] }],
});

const combinationEntry = (name: string, combination_data: MedsCatalogComponent[]) => ({
  name,
  type: "combination" as const,
  combination_data,
});

const finishScheme = (components: readonly MedsCatalogComponent[]) => {
  let state = createCombinationWizard(components, null);

  for (let guard = 0; guard < 12 && state.cursor.view === "step"; guard += 1) {
    const component = components[state.cursor.step];
    if (!component) break;

    if (component.type === "other") {
      state = confirmCombinationOther(state, components);
      continue;
    }

    if (component.type === "group" && state.cursor.stage === "inn") {
      const inn = innsOf(component)[0];
      assert.ok(inn);
      state = chooseCombinationInn(state, components, inn);
      continue;
    }

    state = chooseCombinationTrade(state, components, 0);
  }

  return commitCombinationDraft(state, components);
};

describe("режим real не подменяет ответ моком", () => {
  it("игнорирует прежний флаг и оставляет other с названием тестовой схемы", async () => {
    const previous = process.env.NEXT_PUBLIC_MEDS_COMBINATION_MOCK;
    process.env.NEXT_PUBLIC_MEDS_COMBINATION_MOCK = "true";
    const readsBefore = mockCatalogReads;

    try {
      const names = [
        "Кларитромицин",
        "Омепразол + Амоксициллин",
        PLUS_PLUS,
        "Стандартная тройная терапия",
        "Штаммоспецифические пробиотики",
      ];
      const resolved = await resolveMeds(names, {
        source: "real",
        fetchImpl: async (_input, init) => {
          assert.deepEqual(JSON.parse(String(init?.body)), names);
          return catalogResponse(names.map((name) => other(name)));
        },
      });

      assert.equal(mockCatalogReads, readsBefore);
      assert.deepEqual(
        resolved.drugs.map((drug) => drug.type),
        ["other", "other", "other", "other", "other"],
      );
      assert.equal(resolved.drugs[3]?.name, "Стандартная тройная терапия");
      assert.equal(combinationDrugCount(resolved.drugs[3]), null);
      assert.equal(showsSchemeComposition(resolved.drugs[3]?.type), false);
      assert.equal(combinationSchemeRow(resolved.drugs[3] ?? other(""), null), null);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_MEDS_COMBINATION_MOCK;
      else process.env.NEXT_PUBLIC_MEDS_COMBINATION_MOCK = previous;
    }
  });

  it("строит строки таблицы из клинической рекомендации и ответа API, без лишних строк", async () => {
    const items = [
      { id: "ppi", title: "Омепразол" },
      { id: "named", title: "Стандартная тройная терапия" },
      { id: "plus", title: PLUS_PLUS },
      { id: "ab", title: "Кларитромицин" },
    ];
    const query = collectMedicationQuery([{ categoryId: "medications", items }]);
    const resolved = await resolveMeds(query.names, {
      source: "real",
      fetchImpl: async () =>
        catalogResponse([
          drugEntry("Омепразол", "Омез"),
          other("Стандартная тройная терапия"),
          other(PLUS_PLUS),
          {
            name: "Кларитромицин",
            type: "group",
            data: [
              {
                name: "КЛАРИТРОМИЦИН",
                items: [item({ standard_MNN: "КЛАРИТРОМИЦИН", name_trade: "Клацид" })],
              },
            ],
          },
        ]),
    });

    const rows = items.map((item) => matchMedsDrugForItem(resolved, query, item));

    assert.equal(rows.length, items.length);
    assert.deepEqual(
      rows.map((row) => row?.name),
      items.map((item) => item.title),
    );
    assert.deepEqual(
      rows.map((row) => row?.type),
      ["drug", "other", "other", "group"],
    );
    assert.deepEqual(
      rows.map((row) => showsSchemeComposition(row?.type)),
      [false, false, false, false],
    );
    assert.equal(resolved.drugs.length, query.names.length);
  });

  it("проводит combination из 2, 3 и 4 компонентов через ответ API и мастер схем", async () => {
    const tripleName = "Стандартная тройная терапия";
    const items = [
      { id: "two", title: "Назначение из двух" },
      { id: "three", title: tripleName },
      { id: "four", title: "Назначение из четырёх" },
      { id: "plain", title: tripleName },
    ];
    const two = [
      drugEntry("ОМЕПРАЗОЛ", "Омепразол"),
      drugEntry("АМОКСИЦИЛЛИН", "Амоксициллин"),
    ];
    const three = [
      drugEntry("ОМЕПРАЗОЛ", "Омепразол"),
      groupEntry("Фактор свертывания крови VIII", "ОКТОКОГ АЛЬФА", "Адвейт"),
      otherComponent("Ромашка"),
    ];
    const four = [
      drugEntry("ОМЕПРАЗОЛ", "Омепразол"),
      drugEntry("АМОКСИЦИЛЛИН", "Амоксициллин"),
      drugEntry("КЛАРИТРОМИЦИН", "Клацид"),
      otherComponent("Ромашка"),
    ];
    const query = collectMedicationQuery([{ categoryId: "medications", items }]);
    const resolved = await resolveMeds(query.names, {
      source: "real",
      fetchImpl: async (_input, init) => {
        assert.deepEqual(JSON.parse(String(init?.body)), query.names);
        return catalogResponse([
          combinationEntry(items[0].title, two),
          combinationEntry(items[1].title, three),
          combinationEntry(items[2].title, four),
          other(items[3].title),
        ]);
      },
    });

    const rows = items.map((row) => matchMedsDrugForItem(resolved, query, row));
    assert.deepEqual(
      rows.map((row) => row?.type),
      ["combination", "combination", "combination", "other"],
    );
    assert.deepEqual(
      rows.map((row) => combinationDrugCount(row)),
      [2, 3, 4, null],
    );

    const badgeByCount: Record<number, string> = {
      2: "СХЕМА · 2 ПРЕПАРАТА",
      3: "СХЕМА · 3 ПРЕПАРАТА",
      4: "СХЕМА · 4 ПРЕПАРАТА",
    };

    rows.slice(0, 3).forEach((row, index) => {
      assert.equal(row?.type, "combination");
      if (row?.type !== "combination") return;

      const count = row.combination_data.length;
      assert.equal(schemeBadgeText(count).toLocaleUpperCase("ru-RU"), badgeByCount[count]);
      assert.equal(showsSchemeComposition(row.type), true);

      const draft = finishScheme(combinationComponents(row));
      assert.ok(draft);
      const scheme = combinationSchemeRow(row, draft);
      assert.equal(scheme?.title, items[index]?.title);
      assert.equal(scheme?.componentCount, count);
      assert.equal(scheme?.dose, "");
      assert.equal(scheme?.form, "");
      assert.match(scheme?.summary ?? "", /\S/);
    });

    const plain = rows[3];
    assert.equal(plain?.name, tripleName);
    assert.equal(showsSchemeComposition(plain?.type), false);
    assert.equal(combinationSchemeRow(plain ?? other(tripleName), null), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { combinationComponents, combinationSteps } from "./combinationSelection";
import { collectMedicationQuery } from "./medicationQuery";
import {
  listMedsTrades,
  MEDS_RESOLVE_PATH,
  MedsResolveError,
  resolveMeds,
} from "./medsClient";
import type { MedsCatalogItemRecord, MedsCatalogResponse } from "./medsCatalogTypes";
import { readMedsCombinationMock, readMedsSource } from "./medsSource";

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

describe("временная подстановка тестовых комбинаций", () => {
  it("включается только явным true", () => {
    assert.equal(readMedsCombinationMock(undefined), false);
    assert.equal(readMedsCombinationMock(""), false);
    assert.equal(readMedsCombinationMock("false"), false);
    assert.equal(readMedsCombinationMock("1"), false);
    assert.equal(readMedsCombinationMock(" TRUE "), true);
  });

  it("подставляет известную схему только когда сервер вернул other", async () => {
    const names = ["Стандартная тройная терапия", "Кларитромицин", "Ингибиторы протонного насоса", "Ромашка"];
    const resolved = await resolveMeds(names, {
      source: "real",
      combinationMock: true,
      fetchImpl: async () =>
        catalogResponse([
          other("другое эхо сервера"),
          {
            name: "Кларитромицин",
            type: "drug",
            data: [
              {
                name: "Кларитромицин",
                items: [item({ standard_MNN: "КЛАРИТРОМИЦИН", name_trade: "Только с сервера" })],
              },
            ],
          },
          {
            name: "Ингибиторы протонного насоса",
            type: "group",
            data: [
              {
                name: "ОМЕПРАЗОЛ",
                items: [item({ standard_MNN: "ОМЕПРАЗОЛ", name_trade: "Только группа сервера" })],
              },
            ],
          },
          other("Ромашка"),
        ]),
    });

    assert.equal(resolved.drugs[0]?.name, "Стандартная тройная терапия");
    assert.equal(resolved.drugs[0]?.type, "combination");
    if (resolved.drugs[0]?.type !== "combination") return;
    assert.deepEqual(
      combinationSteps(resolved.drugs[0].combination_data).map((step) => step.name),
      ["Ингибиторы протонного насоса", "Амоксициллин", "Кларитромицин"],
    );
    assert.equal(resolved.drugs[1]?.type, "drug");
    assert.deepEqual(listMedsTrades(resolved.drugs[1] ?? null, ""), ["Только с сервера"]);
    assert.equal(resolved.drugs[2]?.type, "group");
    assert.equal(resolved.drugs[3]?.type, "other");
  });

  it("не подменяет обычный other, строку с ++ и название, которого нет среди тестовых схем", async () => {
    const names = [
      "Кларитромицин",
      "Омепразол + Амоксициллин",
      PLUS_PLUS,
      "стандартная тройная терапия",
      "Штаммоспецифические пробиотики",
    ];
    const resolved = await resolveMeds(names, {
      source: "real",
      combinationMock: true,
      fetchImpl: async (_input, init) => {
        assert.deepEqual(JSON.parse(String(init?.body)), names);
        return catalogResponse(names.map((name) => other(name)));
      },
    });

    assert.deepEqual(
      resolved.drugs.map((drug) => drug.type),
      ["other", "other", "other", "other", "other"],
    );
    assert.equal(
      resolved.drugs[0]?.type === "other" && resolved.drugs[0].data[0]?.items[0]?.name_trade,
      "",
    );
  });

  it("оставляет серверный other, если временная подстановка выключена", async () => {
    const resolved = await resolveMeds(["Стандартная тройная терапия"], {
      source: "real",
      combinationMock: false,
      fetchImpl: async () => catalogResponse([other("Стандартная тройная терапия")]),
    });

    assert.equal(resolved.drugs[0]?.type, "other");
  });

  it("оставляет реальный combination важнее мока", async () => {
    const resolved = await resolveMeds(["Стандартная тройная терапия"], {
      source: "real",
      combinationMock: true,
      fetchImpl: async () =>
        catalogResponse([
          {
            name: "Стандартная тройная терапия",
            type: "combination",
            combination_data: [
              {
                name: "С сервера",
                type: "drug",
                data: [{ name: "С сервера", items: [item({ standard_MNN: "С СЕРВЕРА" })] }],
              },
            ],
          },
        ]),
    });

    assert.equal(resolved.drugs[0]?.type, "combination");
    if (resolved.drugs[0]?.type !== "combination") return;
    assert.deepEqual(
      combinationSteps(resolved.drugs[0].combination_data).map((step) => step.name),
      ["С сервера"],
    );
  });

  it("не заменяет ошибку реального API тестовой схемой", async () => {
    await assert.rejects(
      () =>
        resolveMeds(["Стандартная тройная терапия"], {
          source: "real",
          combinationMock: true,
          fetchImpl: async () => jsonResponse({ error: "Meds catalog request failed" }, 503),
        }),
      (error: unknown) => error instanceof MedsResolveError && error.reason === "http",
    );
  });
});

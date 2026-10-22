import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectMedicationQuery } from "./medicationQuery";
import { resolveMeds } from "./medsClient";
import {
  createMedsCatalogSession,
  LEGACY_MEDS_CATALOG_STORAGE_KEYS,
  MEDS_CATALOG_STORAGE_KEY,
  medsCatalogStorageKey,
  type MedsCatalogSessionEntry,
} from "./medsCatalogSession";
import type { MedsSource } from "./medsSource";
import type { MedsCatalogResponse } from "./medsCatalogTypes";

const createMemoryStorage = () => {
  const data = new Map<string, string>();

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const resolveMock = (names: readonly string[]) => resolveMeds(names, { source: "mock" });

const readStored = (
  storage: { getItem: (key: string) => string | null },
  source?: MedsSource,
) =>
  JSON.parse(storage.getItem(medsCatalogStorageKey(source)) ?? "null") as {
    recommendationKey?: string;
    status?: string;
    catalog?: MedsCatalogResponse | null;
  } | null;

describe("meds catalog session", () => {
  it("собирает названия препаратов в исходном порядке и с повторами", () => {
    const query = collectMedicationQuery([
      {
        categoryId: "treatment",
        items: [{ id: "t", title: "Диета" }],
      },
      {
        categoryId: "medications",
        items: [
          { id: "1", title: "Амоксициллин" },
          { id: "2", title: "Амоксициллин" },
          { id: "3", title: "Ингибиторы протонного насоса" },
        ],
      },
    ]);

    assert.deepEqual(query.ids, ["1", "2", "3"]);
    assert.deepEqual(query.names, [
      "Амоксициллин",
      "Амоксициллин",
      "Ингибиторы протонного насоса",
    ]);
  });

  it("передаёт в resolve массив строк и не повторяет запрос для той же рекомендации", async () => {
    const calls: unknown[] = [];
    const storage = createMemoryStorage();
    const session = createMedsCatalogSession({
      storages: () => [storage],
      resolve: (names) => {
        calls.push(names);
        return resolveMock(names);
      },
    });

    session.begin("reco", ["Амоксициллин", "Амоксициллин"], ["1", "2"]);
    session.ensure("reco", ["Амоксициллин", "Амоксициллин"], ["1", "2"]);
    await flush();

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ["Амоксициллин", "Амоксициллин"]);
    assert.equal(Array.isArray(calls[0]), true);
    assert.equal(session.read("reco")?.status, "ready");
    assert.equal(session.read("reco")?.catalog?.drugs.length, 2);
    assert.equal(session.read("reco")?.catalog?.interactions, null);
  });

  it("не затирает новый выбор поздно пришедшим ответом и не показывает чужой справочник", async () => {
    const pending: Array<{
      names: readonly string[];
      resolve: (value: MedsCatalogResponse) => void;
    }> = [];
    const storage = createMemoryStorage();
    const session = createMedsCatalogSession({
      storages: () => [storage],
      resolve: (names) =>
        new Promise((resolve) => {
          pending.push({ names, resolve });
        }),
    });

    session.begin("first", ["Амоксициллин"], ["a"]);
    session.begin("second", ["Кларитромицин"], ["b"]);
    pending[0]?.resolve(await resolveMock(["Амоксициллин"]));
    await flush();

    const whileSecondLoads = readStored(storage);
    assert.equal(whileSecondLoads?.recommendationKey, "second");
    assert.equal(whileSecondLoads?.status, "loading");
    assert.equal(whileSecondLoads?.catalog, null);
    assert.equal(session.read("second")?.status, "loading");
    assert.equal(session.read("second")?.catalog, null);
    assert.notEqual(session.read("first")?.status, "ready");

    pending[1]?.resolve(await resolveMock(["Кларитромицин"]));
    await flush();

    const ready = session.read("second");
    assert.equal(ready?.status, "ready");
    assert.equal(ready?.catalog?.drugs[0]?.name, "Кларитромицин");
    assert.equal(readStored(storage)?.recommendationKey, "second");
    assert.equal(readStored(storage)?.catalog?.drugs[0]?.name, "Кларитромицин");
  });

  it("после обновления восстанавливает справочник этой рекомендации и не берёт чужой", async () => {
    const storage = createMemoryStorage();
    const first = createMedsCatalogSession({
      storages: () => [storage],
      resolve: resolveMock,
    });

    first.begin("reco", ["Амоксициллин"], ["1"]);
    await flush();

    let calls = 0;
    const restored = createMedsCatalogSession({
      storages: () => [storage],
      resolve: (names) => {
        calls += 1;
        return resolveMock(names);
      },
    });

    restored.ensure("reco", ["Амоксициллин"], ["1"]);
    assert.equal(calls, 0);
    assert.equal(restored.read("reco")?.status, "ready");
    assert.equal(restored.read("reco")?.catalog?.drugs[0]?.type, "drug");

    restored.ensure("another", ["Кларитромицин"], ["9"]);
    assert.equal(calls, 1);
    assert.equal(restored.read("another")?.catalog, null);
    assert.equal(restored.read("another")?.status, "loading");
    assert.equal(readStored(storage)?.recommendationKey, "another");
    assert.equal(readStored(storage)?.catalog, null);
  });

  it("ошибка справочника оставляет каталог пустым", async () => {
    const storage = createMemoryStorage();
    const session = createMedsCatalogSession({
      storages: () => [storage],
      resolve: () => Promise.reject(new Error("network")),
    });

    session.begin("reco", ["Амоксициллин"], ["1"]);
    await flush();

    const entry: MedsCatalogSessionEntry | null = session.read("reco");
    assert.equal(entry?.status, "error");
    assert.equal(entry?.catalog, null);
    assert.equal(readStored(storage)?.catalog, null);
  });

  it("без ключа рекомендации запрос не начинается", () => {
    let calls = 0;
    const session = createMedsCatalogSession({
      storages: () => [createMemoryStorage()],
      resolve: (names) => {
        calls += 1;
        return resolveMock(names);
      },
    });

    session.ensure("", ["Амоксициллин"], ["1"]);
    session.begin("", ["Амоксициллин"], ["1"]);
    assert.equal(calls, 0);
  });

  it("не читает кэш другого режима и не затирает его", async () => {
    const storage = createMemoryStorage();
    const mockSession = createMedsCatalogSession({
      storages: () => [storage],
      source: "mock",
      resolve: resolveMock,
    });

    mockSession.begin("reco", ["Амоксициллин"], ["1"]);
    await flush();
    assert.equal(mockSession.read("reco")?.catalog?.drugs[0]?.type, "drug");
    assert.equal(storage.getItem(medsCatalogStorageKey("real")), null);

    let realCalls = 0;
    const realSession = createMedsCatalogSession({
      storages: () => [storage],
      source: "real",
      resolve: (names) => {
        realCalls += 1;
        return Promise.resolve({
          drugs: names.map((name) => ({
            name,
            type: "other" as const,
            data: [
              {
                name,
                items: [
                  {
                    standard_MNN: name,
                    SMNN_code: "",
                    standard_form: "",
                    standard_dose: "",
                    name_trade: "",
                    code_ATC: "",
                    name_unit: "",
                  },
                ],
              },
            ],
          })),
          interactions: null,
        });
      },
    });

    realSession.ensure("reco", ["Амоксициллин"], ["1"]);
    assert.equal(realCalls, 1);
    assert.equal(realSession.read("reco")?.catalog, null);
    await flush();

    assert.equal(realSession.read("reco")?.status, "ready");
    assert.equal(realSession.read("reco")?.catalog?.drugs[0]?.type, "other");
    assert.equal(mockSession.read("reco")?.catalog?.drugs[0]?.type, "drug");
    assert.notEqual(storage.getItem(medsCatalogStorageKey("mock")), null);

    storage.setItem(MEDS_CATALOG_STORAGE_KEY, "legacy");
    realSession.clear();
    assert.equal(storage.getItem(medsCatalogStorageKey("real")), null);
    assert.equal(storage.getItem(MEDS_CATALOG_STORAGE_KEY), null);
    assert.notEqual(storage.getItem(medsCatalogStorageKey("mock")), null);
    assert.equal(mockSession.read("reco")?.catalog?.drugs[0]?.type, "drug");
  });

  it("ошибка API не стирает сохранённый выбор пользователя", async () => {
    const storage = createMemoryStorage();
    const selectionKey = "directoryCartSelections";
    const combinationKey = "directoryCartCombinationSelections";
    const savedSelections = JSON.stringify({
      reco: [{ id: "1", comment: "утро", title: "Омепразол" }],
    });
    const savedCombination = JSON.stringify({
      reco: {
        "1": {
          picks: [{ inn: "ОМЕПРАЗОЛ", item: null, confirmed: true }],
        },
      },
    });
    storage.setItem(selectionKey, savedSelections);
    storage.setItem(combinationKey, savedCombination);

    const session = createMedsCatalogSession({
      storages: () => [storage],
      source: "real",
      resolve: () => Promise.reject(new Error("timeout")),
    });

    session.begin("reco", ["Омепразол"], ["1"]);
    await flush();

    assert.equal(session.read("reco")?.status, "error");
    assert.equal(session.read("reco")?.catalog, null);
    assert.equal(storage.getItem(selectionKey), savedSelections);
    assert.equal(storage.getItem(combinationKey), savedCombination);
    const storedCatalog = readStored(storage, "real");
    assert.equal(storedCatalog?.status, "error");
    assert.equal(storedCatalog?.catalog, null);
  });

  it("не использует устаревший гибридный кэш и не трогает сохранённые назначения", async () => {
    const storage = createMemoryStorage();
    const selectionKey = "directoryCartSelections";
    const combinationKey = "directoryCartCombinationSelections";
    storage.setItem(selectionKey, "saved-selection");
    storage.setItem(combinationKey, "saved-scheme");

    const hybridCatalog = {
      source: "real",
      combinationMock: true,
      recommendationKey: "reco",
      names: ["Стандартная тройная терапия"],
      ids: ["1"],
      status: "ready",
      catalog: {
        drugs: [
          {
            name: "Стандартная тройная терапия",
            type: "combination",
            combination_data: [
              {
                name: "Амоксициллин",
                type: "drug",
                data: [
                  {
                    name: "АМОКСИЦИЛЛИН",
                    items: [
                      {
                        standard_MNN: "АМОКСИЦИЛЛИН",
                        SMNN_code: "",
                        standard_form: "",
                        standard_dose: "",
                        name_trade: "Тест",
                        code_ATC: "",
                        name_unit: "",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        interactions: null,
      },
    };
    const hybridJson = JSON.stringify(hybridCatalog);
    LEGACY_MEDS_CATALOG_STORAGE_KEYS.forEach((key) => storage.setItem(key, hybridJson));
    storage.setItem(medsCatalogStorageKey("real"), hybridJson);

    let calls = 0;
    const real = createMedsCatalogSession({
      storages: () => [storage],
      source: "real",
      resolve: (names) => {
        calls += 1;
        return Promise.resolve({
          drugs: names.map((name) => ({
            name,
            type: "other" as const,
            data: [
              {
                name,
                items: [
                  {
                    standard_MNN: name,
                    SMNN_code: "",
                    standard_form: "",
                    standard_dose: "",
                    name_trade: "",
                    code_ATC: "",
                    name_unit: "",
                  },
                ],
              },
            ],
          })),
          interactions: null,
        });
      },
    });

    LEGACY_MEDS_CATALOG_STORAGE_KEYS.forEach((key) => {
      assert.equal(storage.getItem(key), null);
    });
    assert.equal(storage.getItem(selectionKey), "saved-selection");
    assert.equal(storage.getItem(combinationKey), "saved-scheme");
    assert.equal(real.hasReady("reco", ["Стандартная тройная терапия"], ["1"]), false);
    real.ensure("reco", ["Стандартная тройная терапия"], ["1"]);
    assert.equal(calls, 1);
    await flush();

    assert.equal(real.read("reco")?.catalog?.drugs[0]?.type, "other");
    const stored = readStored(storage, "real");
    assert.equal(stored?.status, "ready");
    assert.equal(stored?.catalog?.drugs[0]?.type, "other");
    assert.equal(storage.getItem(selectionKey), "saved-selection");
    assert.equal(storage.getItem(combinationKey), "saved-scheme");
    assert.equal(JSON.parse(storage.getItem(medsCatalogStorageKey("real")) ?? "{}").combinationMock, undefined);
  });

  it("load не повторяет запрос и не принимает устаревший ответ", async () => {
    const pending: Array<{
      resolve: (value: MedsCatalogResponse) => void;
    }> = [];
    const session = createMedsCatalogSession({
      storages: () => [createMemoryStorage()],
      resolve: () =>
        new Promise((resolve) => {
          pending.push({ resolve });
        }),
    });

    const first = session.load("first", ["Амоксициллин"], ["1"]);
    const duplicate = session.load("first", ["Амоксициллин"], ["1"]);
    assert.equal(pending.length, 1);

    const second = session.load("second", ["Кларитромицин"], ["2"]);
    assert.equal(pending.length, 2);
    assert.equal((await first).status, "stale");
    assert.equal((await duplicate).status, "stale");
    assert.notEqual(session.read("first")?.status, "ready");

    pending[1]?.resolve(await resolveMock(["Кларитромицин"]));
    assert.equal((await second).status, "ready");
    assert.equal(session.read("second")?.catalog?.drugs[0]?.name, "Кларитромицин");
    assert.equal(session.hasReady("second", ["Кларитромицин"], ["2"]), true);

    let calls = 0;
    const cached = createMedsCatalogSession({
      storages: () => [createMemoryStorage()],
      resolve: (names) => {
        calls += 1;
        return resolveMock(names);
      },
    });
    cached.begin("reco", ["Амоксициллин"], ["1"]);
    await flush();
    calls = 0;
    assert.equal(cached.hasReady("reco", ["Амоксициллин"], ["1"]), true);
    assert.equal((await cached.load("reco", ["Амоксициллин"], ["1"])).status, "ready");
    assert.equal(calls, 0);
  });
});

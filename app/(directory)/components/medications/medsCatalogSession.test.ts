import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectMedicationQuery } from "./medicationQuery";
import { resolveMeds } from "./medsClient";
import {
  createMedsCatalogSession,
  MEDS_CATALOG_STORAGE_KEY,
  type MedsCatalogSessionEntry,
} from "./medsCatalogSession";
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

const readStored = (storage: { getItem: (key: string) => string | null }) =>
  JSON.parse(storage.getItem(MEDS_CATALOG_STORAGE_KEY) ?? "null") as {
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
        return resolveMeds(names);
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
    pending[0]?.resolve(await resolveMeds(["Амоксициллин"]));
    await flush();

    const whileSecondLoads = readStored(storage);
    assert.equal(whileSecondLoads?.recommendationKey, "second");
    assert.equal(whileSecondLoads?.status, "loading");
    assert.equal(whileSecondLoads?.catalog, null);
    assert.equal(session.read("second")?.status, "loading");
    assert.equal(session.read("second")?.catalog, null);
    assert.notEqual(session.read("first")?.status, "ready");

    pending[1]?.resolve(await resolveMeds(["Кларитромицин"]));
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
      resolve: resolveMeds,
    });

    first.begin("reco", ["Амоксициллин"], ["1"]);
    await flush();

    let calls = 0;
    const restored = createMedsCatalogSession({
      storages: () => [storage],
      resolve: (names) => {
        calls += 1;
        return resolveMeds(names);
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
        return resolveMeds(names);
      },
    });

    session.ensure("", ["Амоксициллин"], ["1"]);
    session.begin("", ["Амоксициллин"], ["1"]);
    assert.equal(calls, 0);
  });
});

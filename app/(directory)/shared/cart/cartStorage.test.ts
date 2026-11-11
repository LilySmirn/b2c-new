import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCartStorage } from "./cartStorage";
import {
  CART_CUSTOM_ITEMS_STORAGE_KEY,
  CART_GENERAL_COMMENT_STORAGE_KEY,
  CART_RECOMMENDATION_STORAGE_KEY,
  CART_SELECTIONS_STORAGE_KEY,
  CART_SYNC_META_STORAGE_KEY,
} from "./cartStorageKeys";
import {
  createCartSync,
  parseCartSyncMeta,
  reconcileCartStorages,
  type CartSyncMessage,
  type StorageLike,
} from "./cartSync";

const createMemoryStorage = (): StorageLike => {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
};

describe("cartStorage", () => {
  it("пишет recommendation в session и local и публикует sync", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    const published: CartSyncMessage[] = [];
    const storage = createCartStorage({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      publish: (scopes) => {
        published.push({
          type: "cart-sync",
          origin: "local",
          revision: published.length + 1,
          writerId: "test",
          updatedAt: 1,
          scopes: [...scopes],
        });
      },
      clearMedsCatalog: () => {},
      reconcile: false,
    });

    storage.writeRecommendation(
      "K26: Язва",
      { id: "1", title: "ЯБ", mkbCodes: ["K26"], source: "minzdrav" },
      "K26: Язва|1|ЯБ|K26",
    );

    const raw = session.getItem(CART_RECOMMENDATION_STORAGE_KEY);
    assert.equal(raw, local.getItem(CART_RECOMMENDATION_STORAGE_KEY));
    assert.ok(raw?.includes("K26: Язва"));
    assert.deepEqual(published.at(-1)?.scopes, ["recommendation"]);
  });

  it("не публикует повторную запись тех же selections", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    let publishCount = 0;
    const storage = createCartStorage({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      publish: () => {
        publishCount += 1;
      },
      clearMedsCatalog: () => {},
      reconcile: false,
    });

    const items = [
      {
        id: "a",
        groupTitle: "Лечение",
        sectionTitle: "Лечение",
        title: "Омепразол",
        comment: "1 раз",
      },
    ];

    assert.equal(storage.writeSelections("key-1", items), true);
    assert.equal(storage.writeSelections("key-1", items), false);
    assert.equal(publishCount, 1);
    assert.equal(
      storage.readSelectionsForKey("key-1")[0]?.comment,
      "1 раз",
    );
  });

  it("нормализует legacy selections вида string id", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    session.setItem(
      CART_SELECTIONS_STORAGE_KEY,
      JSON.stringify({ "key-1": ["old-id"] }),
    );

    const storage = createCartStorage({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      publish: () => {},
      clearMedsCatalog: () => {},
      reconcile: false,
    });

    assert.deepEqual(storage.readSelectionsForKey("key-1"), [
      { id: "old-id", comment: "" },
    ]);
  });

  it("хранит custom items и general comment по recommendationKey", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    const storage = createCartStorage({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      publish: () => {},
      clearMedsCatalog: () => {},
      reconcile: false,
    });

    storage.writeCustomItems("key-1", [
      { id: "c1", name: "Доп. услуга", comment: "note" },
    ]);
    storage.writeGeneralComment("key-1", "Общая рекомендация");

    assert.equal(storage.readCustomItems("key-1")[0]?.name, "Доп. услуга");
    assert.equal(storage.readGeneralComment("key-1"), "Общая рекомендация");
    assert.ok(local.getItem(CART_CUSTOM_ITEMS_STORAGE_KEY));
    assert.ok(local.getItem(CART_GENERAL_COMMENT_STORAGE_KEY));
  });

  it("clearCartState удаляет данные и вызывает clear meds", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    let medsCleared = 0;
    const published: string[][] = [];
    const storage = createCartStorage({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      publish: (scopes) => {
        published.push([...scopes]);
      },
      clearMedsCatalog: () => {
        medsCleared += 1;
      },
      reconcile: false,
    });

    storage.writeRecommendation("D", { id: "1" }, "k");
    storage.writeSelections("k", [
      {
        id: "1",
        groupTitle: "g",
        sectionTitle: "s",
        title: "t",
        comment: "",
      },
    ]);
    storage.clearCartState();

    assert.equal(session.getItem(CART_RECOMMENDATION_STORAGE_KEY), null);
    assert.equal(local.getItem(CART_SELECTIONS_STORAGE_KEY), null);
    assert.equal(medsCleared, 1);
    assert.deepEqual(published.at(-1), ["cleared"]);
  });
});

describe("cartSync reconcile", () => {
  it("предпочитает localStorage с большей ревизией и зеркалит в session", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();

    session.setItem(CART_RECOMMENDATION_STORAGE_KEY, JSON.stringify({ old: true }));
    session.setItem(
      CART_SYNC_META_STORAGE_KEY,
      JSON.stringify({
        revision: 1,
        writerId: "a",
        updatedAt: 1,
        scopes: ["recommendation"],
      }),
    );

    local.setItem(CART_RECOMMENDATION_STORAGE_KEY, JSON.stringify({ fresh: true }));
    local.setItem(
      CART_SYNC_META_STORAGE_KEY,
      JSON.stringify({
        revision: 3,
        writerId: "b",
        updatedAt: 3,
        scopes: ["recommendation"],
      }),
    );

    assert.equal(reconcileCartStorages(session, local), "prefer-local");
    assert.equal(
      session.getItem(CART_RECOMMENDATION_STORAGE_KEY),
      local.getItem(CART_RECOMMENDATION_STORAGE_KEY),
    );
    assert.equal(parseCartSyncMeta(session.getItem(CART_SYNC_META_STORAGE_KEY))?.revision, 3);
  });

  it("игнорирует устаревшие remote-сообщения и не зацикливается", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    const received: number[] = [];

    const sync = createCartSync({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "tab-a",
      now: () => 10,
    });

    sync.subscribe((message) => received.push(message.revision));
    sync.start();

    const first = sync.publish(["selections"]);
    assert.ok(first);
    assert.deepEqual(received, [first!.revision]);

    const applied = sync.applyRemoteForTests({
      type: "cart-sync",
      origin: "remote",
      revision: first!.revision,
      writerId: "tab-b",
      updatedAt: 11,
      scopes: ["selections"],
    });
    assert.equal(applied, false);
    assert.deepEqual(received, [first!.revision]);

    local.setItem(CART_SELECTIONS_STORAGE_KEY, JSON.stringify({ k: [] }));
    const appliedNext = sync.applyRemoteForTests({
      type: "cart-sync",
      origin: "remote",
      revision: first!.revision + 1,
      writerId: "tab-b",
      updatedAt: 12,
      scopes: ["selections"],
    });
    assert.equal(appliedNext, true);
    assert.deepEqual(received, [first!.revision, first!.revision + 1]);
    assert.equal(
      session.getItem(CART_SELECTIONS_STORAGE_KEY),
      local.getItem(CART_SELECTIONS_STORAGE_KEY),
    );

    sync.dispose();
  });

  it("remote-сообщение помечается origin=remote, publish — origin=local", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    const origins: string[] = [];

    const sync = createCartSync({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "tab-a",
      now: () => 1,
    });

    sync.subscribe((message) => origins.push(message.origin));
    sync.start();
    sync.publish(["selections"]);
    sync.applyRemoteForTests({
      type: "cart-sync",
      origin: "remote",
      revision: sync.getLastAppliedRevision() + 1,
      writerId: "tab-b",
      updatedAt: 2,
      scopes: ["customItems"],
    });

    assert.deepEqual(origins, ["local", "remote"]);
    sync.dispose();
  });

  it("storage-событие по data-ключу до meta всё равно применяется после meta", () => {
    const session = createMemoryStorage();
    const local = createMemoryStorage();
    const storageListeners: Array<(event: StorageEvent) => void> = [];
    const received: string[] = [];

    const sync = createCartSync({
      getSessionStorage: () => session,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: (_type, listener) => {
        storageListeners.push(listener);
        return () => {};
      },
      writerId: "tab-b",
      now: () => 10,
    });

    sync.subscribe((message) => received.push(message.scopes.join("+")));
    sync.start();

    // Другая вкладка сначала пишет selections, затем meta.
    local.setItem(CART_SELECTIONS_STORAGE_KEY, JSON.stringify({ reco: [{ id: "1", comment: "" }] }));
    storageListeners.forEach((listener) =>
      listener({
        key: CART_SELECTIONS_STORAGE_KEY,
        newValue: local.getItem(CART_SELECTIONS_STORAGE_KEY),
      } as StorageEvent),
    );
    // meta ещё старая/отсутствует — apply не должен пройти без revision bump
    assert.deepEqual(received, []);

    const meta = {
      revision: 1,
      writerId: "tab-a",
      updatedAt: 11,
      scopes: ["selections"] as const,
    };
    local.setItem(CART_SYNC_META_STORAGE_KEY, JSON.stringify(meta));
    storageListeners.forEach((listener) =>
      listener({
        key: CART_SYNC_META_STORAGE_KEY,
        newValue: JSON.stringify(meta),
      } as StorageEvent),
    );

    assert.deepEqual(received, ["selections"]);
    assert.equal(
      session.getItem(CART_SELECTIONS_STORAGE_KEY),
      local.getItem(CART_SELECTIONS_STORAGE_KEY),
    );
    sync.dispose();
  });

  it("две вкладки синхронизируют selections через shared local + remote apply", () => {
    const sessionA = createMemoryStorage();
    const sessionB = createMemoryStorage();
    const local = createMemoryStorage();
    const syncA = createCartSync({
      getSessionStorage: () => sessionA,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "tab-a",
      now: () => 100,
    });
    const syncB = createCartSync({
      getSessionStorage: () => sessionB,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "tab-b",
      now: () => 100,
    });

    const storageA = createCartStorage({
      getSessionStorage: () => sessionA,
      getLocalStorage: () => local,
      publish: (scopes) => syncA.publish(scopes),
      clearMedsCatalog: () => {},
      reconcile: true,
    });
    const storageB = createCartStorage({
      getSessionStorage: () => sessionB,
      getLocalStorage: () => local,
      publish: (scopes) => syncB.publish(scopes),
      clearMedsCatalog: () => {},
      reconcile: true,
    });

    let tabBSelections: unknown = null;
    syncB.subscribe((message) => {
      if (message.scopes.includes("selections")) {
        tabBSelections = storageB.readSelectionsForKey("reco");
      }
    });
    syncA.start();
    syncB.start();

    storageA.writeSelections("reco", [
      {
        id: "drug-1",
        groupTitle: "Препараты",
        sectionTitle: "Препараты",
        title: "Омепразол",
        comment: "утро",
      },
    ]);

    const meta = parseCartSyncMeta(local.getItem(CART_SYNC_META_STORAGE_KEY));
    assert.ok(meta);
    syncB.applyRemoteForTests({ type: "cart-sync", origin: "remote", ...meta! });

    assert.deepEqual(tabBSelections, [
      {
        id: "drug-1",
        groupTitle: "Препараты",
        sectionTitle: "Препараты",
        title: "Омепразол",
        comment: "утро",
      },
    ]);
    assert.equal(
      sessionB.getItem(CART_SELECTIONS_STORAGE_KEY),
      local.getItem(CART_SELECTIONS_STORAGE_KEY),
    );

    // Устаревший session B не побеждает fresh local после reconcile.
    sessionB.setItem(
      CART_SELECTIONS_STORAGE_KEY,
      JSON.stringify({ reco: [{ id: "stale", comment: "" }] }),
    );
    sessionB.setItem(
      CART_SYNC_META_STORAGE_KEY,
      JSON.stringify({
        revision: 0,
        writerId: "old",
        updatedAt: 1,
        scopes: ["selections"],
      }),
    );
    assert.equal(storageB.readSelectionsForKey("reco")[0]?.id, "drug-1");

    syncA.dispose();
    syncB.dispose();
  });

  it("сообщение другого writer зеркалит local → session подписчика", () => {
    const sessionA = createMemoryStorage();
    const sessionB = createMemoryStorage();
    const local = createMemoryStorage();

    const syncA = createCartSync({
      getSessionStorage: () => sessionA,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "a",
      now: () => 1,
    });
    const syncB = createCartSync({
      getSessionStorage: () => sessionB,
      getLocalStorage: () => local,
      createBroadcastChannel: () => null,
      addWindowListener: () => () => {},
      writerId: "b",
      now: () => 1,
    });

    const receivedB: CartSyncMessage[] = [];
    syncB.subscribe((message) => receivedB.push(message));
    syncA.start();
    syncB.start();

    local.setItem(
      CART_CUSTOM_ITEMS_STORAGE_KEY,
      JSON.stringify({ k: [{ id: "1", name: "x", comment: "" }] }),
    );
    const message = syncA.publish(["customItems"]);
    assert.ok(message);

    syncB.applyRemoteForTests({ ...message!, origin: "remote" });

    assert.equal(receivedB.length, 1);
    assert.deepEqual(receivedB[0]?.scopes, ["customItems"]);
    assert.equal(
      sessionB.getItem(CART_CUSTOM_ITEMS_STORAGE_KEY),
      local.getItem(CART_CUSTOM_ITEMS_STORAGE_KEY),
    );
    assert.equal(
      sessionB.getItem(CART_SYNC_META_STORAGE_KEY),
      local.getItem(CART_SYNC_META_STORAGE_KEY),
    );

    syncA.dispose();
    syncB.dispose();
  });
});

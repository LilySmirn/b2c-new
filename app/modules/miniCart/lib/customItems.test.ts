import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCustomItemToList,
  capitalizeCustomItemName,
  normalizeCustomItemValues,
  removeCustomItemFromList,
  updateCustomItemInList,
  validateCustomItemName,
} from "./customItems";

describe("customItems helpers (D3)", () => {
  it("validates name like CustomCartItemModal", () => {
    assert.equal(validateCustomItemName(""), "Укажите название услуги или медикамента");
    assert.equal(validateCustomItemName("   "), "Укажите название услуги или медикамента");
    assert.equal(validateCustomItemName("a".repeat(161)).includes("160"), true);
    assert.equal(validateCustomItemName("Гастроскопия"), "");
  });

  it("capitalizes first letter and trims comment on normalize", () => {
    assert.equal(capitalizeCustomItemName("гастроскопия"), "Гастроскопия");
    assert.deepEqual(
      normalizeCustomItemValues({
        name: "  омепразол  ",
        comment: "  2 раза в сутки  ",
      }),
      { name: "Омепразол", comment: "2 раза в сутки" },
    );
    assert.equal(normalizeCustomItemValues({ name: "  ", comment: "x" }), null);
  });

  it("creates, updates with stable id, and removes without touching others", () => {
    const base = [
      { id: "a", name: "A", comment: "" },
      { id: "b", name: "B", comment: "keep" },
    ];

    const created = addCustomItemToList(base, {
      id: "c",
      name: "C",
      comment: "new",
    });
    assert.equal(created.length, 3);
    assert.equal(created[2]?.id, "c");
    assert.deepEqual(created[0], base[0]);
    assert.deepEqual(created[1], base[1]);

    const updated = updateCustomItemInList(created, "c", {
      name: "C2",
      comment: "changed",
    });
    assert.equal(updated.find((item) => item.id === "c")?.name, "C2");
    assert.equal(updated.find((item) => item.id === "c")?.id, "c");
    assert.equal(updated.find((item) => item.id === "b")?.comment, "keep");
    assert.equal(updated.length, 3);

    const removed = removeCustomItemFromList(updated, "c");
    assert.deepEqual(
      removed.map((item) => item.id),
      ["a", "b"],
    );
    assert.equal(removed.find((item) => item.id === "b")?.comment, "keep");
  });

  it("does not duplicate on update of existing id", () => {
    const items = [{ id: "x", name: "Old", comment: "" }];
    const next = updateCustomItemInList(items, "x", {
      name: "New",
      comment: "note",
    });
    assert.equal(next.length, 1);
    assert.deepEqual(next[0], { id: "x", name: "New", comment: "note" });
  });
});

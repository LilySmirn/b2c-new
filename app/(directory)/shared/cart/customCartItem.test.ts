import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStoredCustomCartItem,
  getCustomCartItemKind,
  mergeCustomCartItemValues,
  normalizeStoredCustomCartItem,
  sameCustomCartItems,
} from "./customCartItem";

describe("customCartItem model", () => {
  it("считает записи без kind услугами", () => {
    assert.equal(getCustomCartItemKind({}), "service");
    assert.equal(getCustomCartItemKind({ kind: "drug" }), "drug");
    assert.deepEqual(normalizeStoredCustomCartItem({ id: "1", name: "Массаж" }), {
      id: "1",
      name: "Массаж",
      comment: "",
    });
  });

  it("нормализует медикамент и отбрасывает мусорные поля", () => {
    assert.deepEqual(
      normalizeStoredCustomCartItem({
        id: "d1",
        name: "Омез",
        comment: "note",
        kind: "drug",
        inn: " ОМЕПРАЗОЛ ",
        trade: "Омез",
        smnnCode: "code",
        dose: "20 мг",
        form: "КАПСУЛЫ",
        source: "catalog",
        extra: true,
      }),
      {
        id: "d1",
        name: "Омез",
        comment: "note",
        kind: "drug",
        inn: "ОМЕПРАЗОЛ",
        trade: "Омез",
        smnnCode: "code",
        dose: "20 мг",
        form: "КАПСУЛЫ",
        source: "catalog",
      },
    );
  });

  it("собирает service без полей препарата", () => {
    assert.deepEqual(
      buildStoredCustomCartItem("s1", {
        kind: "service",
        name: " Массаж ",
        comment: " 10 ",
        inn: "should-drop",
      }),
      { id: "s1", name: "Массаж", comment: "10", kind: "service" },
    );
  });

  it("merge name/comment не затирает идентификаторы медикамента", () => {
    const item = buildStoredCustomCartItem("d1", {
      kind: "drug",
      name: "Омез",
      comment: "",
      inn: "ОМЕПРАЗОЛ",
      trade: "Омез",
      smnnCode: "smnn",
      source: "catalog",
    });

    assert.deepEqual(
      mergeCustomCartItemValues(item, { name: "Омез Форте", comment: "вечером" }),
      {
        ...item,
        name: "Омез Форте",
        comment: "вечером",
      },
    );
  });

  it("sameCustomCartItems учитывает kind и идентификаторы", () => {
    const left = [
      buildStoredCustomCartItem("1", {
        kind: "drug",
        name: "Омез",
        comment: "",
        inn: "ОМЕПРАЗОЛ",
        trade: "Омез",
        source: "catalog",
      }),
    ];
    const right = [
      buildStoredCustomCartItem("1", {
        kind: "drug",
        name: "Омез",
        comment: "",
        inn: "ОМЕПРАЗОЛ",
        trade: "Омез",
        source: "catalog",
      }),
    ];
    const changed = [
      buildStoredCustomCartItem("1", {
        kind: "drug",
        name: "Омез",
        comment: "",
        inn: "ОМЕПРАЗОЛ",
        trade: "Омепразол",
        source: "catalog",
      }),
    ];

    assert.equal(sameCustomCartItems(left, right), true);
    assert.equal(sameCustomCartItems(left, changed), false);
  });
});

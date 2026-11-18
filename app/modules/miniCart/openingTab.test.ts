import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MiniCartTab } from "./types";
import {
  miniCartTabPageForId,
  resolveMiniCartOpeningTabId,
} from "./openingTab";

const tabs: MiniCartTab[] = [
  { id: "required-diagnostics", label: "Диагностика обязательная", enabled: true },
  { id: "indicated-diagnostics", label: "Диагностика по показаниям", enabled: true },
  { id: "treatment", label: "Лечение", enabled: true },
  { id: "drugs", label: "Препараты", enabled: true, active: true },
  { id: "scales", label: "Шкалы и опросники", enabled: true },
  { id: "lifestyle", label: "Образ жизни", enabled: false },
  { id: "vaccination", label: "Вакцинация", enabled: true },
  { id: "appendix-a3", label: "Приложение А3", enabled: true },
];

describe("resolveMiniCartOpeningTabId", () => {
  it("keeps preferred enabled tab id", () => {
    assert.equal(
      resolveMiniCartOpeningTabId(tabs, "required-diagnostics"),
      "required-diagnostics",
    );
    assert.equal(resolveMiniCartOpeningTabId(tabs, "scales"), "scales");
  });

  it("falls back when preferred is missing or disabled", () => {
    assert.equal(resolveMiniCartOpeningTabId(tabs, "lifestyle"), "drugs");
    assert.equal(resolveMiniCartOpeningTabId(tabs, "unknown"), "drugs");
    assert.equal(resolveMiniCartOpeningTabId(tabs, null), "drugs");
  });
});

describe("miniCartTabPageForId", () => {
  it("pages overflow tabs into the second strip", () => {
    assert.equal(miniCartTabPageForId(tabs, "drugs"), 0);
    assert.equal(miniCartTabPageForId(tabs, "scales"), 1);
    assert.equal(miniCartTabPageForId(tabs, "appendix-a3"), 1);
  });
});

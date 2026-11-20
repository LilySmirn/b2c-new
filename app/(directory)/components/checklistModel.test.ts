import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySelectionsToSections,
  getFirstAvailableCategoryId,
  resolveActiveCategoryId,
  type ChecklistSection,
  type SelectedPrescription,
} from "./checklistModel";

const section = (
  categoryId: string,
  items: { id: string; checked?: boolean; comment?: string }[],
): ChecklistSection => ({
  id: `${categoryId}-section`,
  title: categoryId,
  categoryId,
  groupTitle: categoryId,
  items: items.map((item) => ({
    id: item.id,
    checked: item.checked ?? false,
    qualityControl: false,
    code: "",
    title: item.id,
    info: "",
    comment: item.comment ?? "",
  })),
});

describe("resolveActiveCategoryId", () => {
  it("сохраняет текущую вкладку, если категория доступна", () => {
    const sections = [
      section("required-diagnostics", [{ id: "d1" }]),
      section("medications", [{ id: "m1" }]),
    ];

    assert.equal(
      resolveActiveCategoryId("medications", sections),
      "medications",
    );
  });

  it("сбрасывает на первую доступную, если текущей нет", () => {
    const sections = [
      section("required-diagnostics", [{ id: "d1" }]),
      section("medications", [{ id: "m1" }]),
    ];

    assert.equal(
      resolveActiveCategoryId("lifestyle", sections),
      "required-diagnostics",
    );
  });

  it("учитывает extraAvailableIds (приложение А3)", () => {
    const sections = [section("medications", [{ id: "m1" }])];

    assert.equal(
      resolveActiveCategoryId("appendix-a3", sections, ["appendix-a3"]),
      "appendix-a3",
    );
  });
});

describe("getFirstAvailableCategoryId", () => {
  it("возвращает первую категорию по порядку вкладок", () => {
    const sections = [
      section("medications", [{ id: "m1" }]),
      section("required-diagnostics", [{ id: "d1" }]),
    ];

    assert.equal(getFirstAvailableCategoryId(sections), "required-diagnostics");
  });
});

describe("applySelectionsToSections", () => {
  it("ставит checked из selections, а не из шаблона секций", () => {
    const sections = [
      section("medications", [
        { id: "m1", checked: false },
        { id: "m2", checked: true, comment: "stale" },
      ]),
    ];
    const selected: SelectedPrescription[] = [
      {
        id: "m1",
        groupTitle: "Препараты",
        sectionTitle: "Препараты",
        title: "m1",
        comment: "утро",
      },
    ];

    const next = applySelectionsToSections(sections, selected);
    assert.equal(next[0]?.items[0]?.checked, true);
    assert.equal(next[0]?.items[0]?.comment, "утро");
    assert.equal(next[0]?.items[1]?.checked, false);
    assert.equal(next[0]?.items[1]?.comment, "stale");
  });

  it("находит selection по sourceIds объединённой позиции", () => {
    const sections: ChecklistSection[] = [
      {
        id: "meds",
        title: "Препараты",
        categoryId: "medications",
        groupTitle: "Препараты",
        items: [
          {
            id: "merged",
            checked: false,
            qualityControl: false,
            code: "",
            title: "Drug",
            info: "",
            comment: "",
            sourceIds: ["raw-a", "raw-b"],
          },
        ],
      },
    ];
    const selected: SelectedPrescription[] = [
      {
        id: "raw-b",
        groupTitle: "Препараты",
        sectionTitle: "Препараты",
        title: "Drug",
        comment: "",
      },
    ];

    const next = applySelectionsToSections(sections, selected);
    assert.equal(next[0]?.items[0]?.checked, true);
  });
});

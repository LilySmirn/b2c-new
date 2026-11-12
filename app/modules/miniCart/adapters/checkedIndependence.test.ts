/**
 * Regression: selected (checked) и medicationDrafts независимы,
 * как в production PrescriptionChecklist / SideCart.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChecklistSection } from "@/app/(directory)/components/checklistModel";
import type { ChecklistAssignmentSnapshot } from "@/app/(directory)/components/medications/assignmentSnapshot";
import type { MedsCatalogResponse } from "@/app/(directory)/components/medications/medsCatalogTypes";
import type { SelectedPrescription } from "@/app/(directory)/components/checklistModel";
import { adaptDirectoryCartToMiniCart } from "./fromDirectoryCart";

const sections: ChecklistSection[] = [
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
        info: "",
        comment: "",
        treatmentPlan: "1 раз в сутки",
        treatmentDuration: "14 дней",
      },
      {
        id: "med-combo",
        checked: false,
        qualityControl: true,
        code: "A1",
        title: "Омепразол++Амоксициллин",
        info: "",
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

const catalogQuery = {
  ids: ["med-drug", "med-combo"],
  names: ["Омепразол", "Омепразол++Амоксициллин"],
};

const combinationDraft = {
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
};

const adapt = (assignment: ChecklistAssignmentSnapshot) =>
  adaptDirectoryCartToMiniCart({
    diagnosisTitle: "K26",
    sections,
    catalog,
    catalogQuery,
    assignment,
  });

/** Зеркало production-проекции SideCart: только checked → SelectedPrescription. */
const projectSelectedPrescriptions = (
  source: ChecklistSection[],
  itemStates: ChecklistAssignmentSnapshot["itemStates"],
): SelectedPrescription[] =>
  source.flatMap((section) =>
    section.items
      .filter((item) => itemStates[item.id]?.checked ?? item.checked)
      .map((item) => ({
        id: item.id,
        categoryId: section.categoryId,
        categoryTitle: section.categoryTitle ?? section.groupTitle,
        groupTitle: section.groupTitle,
        sectionTitle: section.title,
        title: item.title,
        comment: itemStates[item.id]?.comment ?? item.comment,
        treatmentPlan: item.treatmentPlan,
        treatmentDuration: item.treatmentDuration,
      })),
  );

describe("checked independence from medication drafts", () => {
  it("keeps selected=false when trade draft exists", () => {
    const view = adapt({
      medicationDrafts: {
        "med-drug": { inn: "ОМЕПРАЗОЛ", trade: "Омез", dose: "20 мг", form: "КАПСУЛЫ" },
      },
      medicationIntake: {},
      combinations: {},
      itemStates: {
        "med-drug": { checked: false, comment: "" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-drug");
    assert.equal(item?.selected, false);
    assert.equal(item?.selectedTrade, "Омез");
    assert.equal(
      projectSelectedPrescriptions(sections, {
        "med-drug": { checked: false, comment: "" },
      }).length,
      0,
    );
  });

  it("keeps selected=true without trade draft", () => {
    const view = adapt({
      medicationDrafts: {},
      medicationIntake: {},
      combinations: {},
      itemStates: {
        "med-drug": { checked: true, comment: "" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-drug");
    assert.equal(item?.selected, true);
    assert.equal(item?.selectedTrade, "");

    const selected = projectSelectedPrescriptions(sections, {
      "med-drug": { checked: true, comment: "" },
    });
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.title, "Омепразол");
    assert.equal(selected[0]?.id, "med-drug");
  });

  it("keeps selected=true with trade draft", () => {
    const view = adapt({
      medicationDrafts: {
        "med-drug": { inn: "ОМЕПРАЗОЛ", trade: "Омез" },
      },
      medicationIntake: {},
      combinations: {},
      itemStates: {
        "med-drug": { checked: true, comment: "" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-drug");
    assert.equal(item?.selected, true);
    assert.equal(item?.selectedTrade, "Омез");
  });

  it("does not select scheme from confirmed combination alone", () => {
    const view = adapt({
      medicationDrafts: {},
      medicationIntake: {},
      combinations: { "med-combo": combinationDraft },
      itemStates: {
        "med-combo": { checked: false, comment: "" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-combo");
    assert.equal(item?.selected, false);
    assert.equal(item?.selectedTrade, "Омез + Флемоксин");
    assert.ok(view.schemeByItemId["med-combo"]?.confirmed);
    assert.equal(
      projectSelectedPrescriptions(sections, {
        "med-combo": { checked: false, comment: "" },
      }).length,
      0,
    );
  });

  it("selects configured scheme only when checked", () => {
    const view = adapt({
      medicationDrafts: {},
      medicationIntake: {},
      combinations: { "med-combo": combinationDraft },
      itemStates: {
        "med-combo": { checked: true, comment: "" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-combo");
    assert.equal(item?.selected, true);
    assert.equal(item?.selectedTrade, "Омез + Флемоксин");

    const selected = projectSelectedPrescriptions(sections, {
      "med-combo": { checked: true, comment: "" },
    });
    assert.equal(selected[0]?.title, "Омепразол++Амоксициллин");
  });

  it("maps non-empty comment checked flag without requiring trade", () => {
    const view = adapt({
      medicationDrafts: {},
      medicationIntake: {},
      combinations: {},
      itemStates: {
        "med-drug": { checked: true, comment: "по схеме" },
      },
    });

    const item = view.drugItems.find((row) => row.id === "med-drug");
    assert.equal(item?.selected, true);
    assert.equal(item?.commentShort, "по схеме");
    assert.equal(item?.selectedTrade, "");
  });
});

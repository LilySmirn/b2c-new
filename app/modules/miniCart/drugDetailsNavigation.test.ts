import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChecklistSection } from "@/app/(directory)/components/checklistModel";
import type { MedsCatalogResponse } from "@/app/(directory)/components/medications/medsCatalogTypes";
import { adaptDirectoryCartToMiniCart } from "./adapters/fromDirectoryCart";
import { miniCartOpFlags } from "./assignmentOps";
import type { MiniCartView } from "./types";

const sections: ChecklistSection[] = [
  {
    id: "sec-meds",
    title: "Медикаментозное лечение",
    categoryId: "medications",
    groupTitle: "Препараты",
    items: [
      {
        id: "med-1",
        checked: false,
        qualityControl: true,
        code: "B1",
        title: "Мидокалм Лонг",
        info: "Обоснование назначения препарата при артрозе.",
        infoComment: "Полный комментарий из клинической рекомендации.",
        comment: "",
        treatmentPlan: "1 раз в сутки",
        treatmentDuration: "14 дней",
      },
    ],
  },
];

const catalog: MedsCatalogResponse = {
  interactions: null,
  drugs: [
    {
      name: "Мидокалм Лонг",
      type: "drug",
      data: [
        {
          name: "ТОЛПЕРИЗОН",
          items: [
            {
              standard_MNN: "ТОЛПЕРИЗОН",
              SMNN_code: "smnn-1",
              standard_form: "ТАБЛЕТКИ ПРОЛОНГИРОВАННОГО ДЕЙСТВИЯ",
              standard_dose: "450 мг",
              name_trade: "Мидокалм Лонг",
              code_ATC: "M03BX04",
              name_unit: "шт",
            },
          ],
        },
      ],
    },
  ],
};

describe("drug-details adapter fields", () => {
  it("exposes separated info fields, drafts, intake and catalog options", () => {
    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "M19.8",
      sections,
      catalog,
      catalogQuery: { ids: ["med-1"], names: ["Мидокалм Лонг"] },
      assignment: {
        medicationDrafts: {
          "med-1": {
            inn: "ТОЛПЕРИЗОН",
            trade: "Мидокалм Лонг",
            dose: "450 мг",
            form: "ТАБЛЕТКИ ПРОЛОНГИРОВАННОГО ДЕЙСТВИЯ",
            scheme: "утром",
            course: "10 дней",
          },
        },
        medicationIntake: {
          "med-1": {
            morning: true,
            day: false,
            evening: false,
            night: false,
            relation: "after",
          },
        },
        combinations: {},
        itemStates: {
          "med-1": { checked: true, comment: "Мой комментарий" },
        },
        commentSources: {
          "med-1": "user",
        },
      },
    });

    const item = view.drugItems[0];
    assert.ok(item);
    assert.equal(item.selected, true);
    assert.equal(item.selectedTrade, "Мидокалм Лонг");
    assert.equal(item.selectedDose, "450 мг");
    assert.equal(item.commentText, "Мой комментарий");

    const details = item.medicationDetails;
    assert.ok(details);
    assert.equal(details.description, "Обоснование назначения препарата при артрозе.");
    assert.equal(
      details.infoComment,
      "Полный комментарий из клинической рекомендации.",
    );
    assert.equal(details.originalScheme, "1 раз в сутки");
    assert.equal(details.originalCourse, "14 дней");
    assert.equal(details.schemeDraft, "утром");
    assert.equal(details.courseDraft, "10 дней");
    assert.equal(details.intake.morning, true);
    assert.equal(details.intake.relation, "after");
    assert.equal(details.noteCustom, true);
    assert.ok(details.doseOptions.includes("450 мг"));
    assert.ok(details.formOptions.length > 0);
  });

  it("keeps display scheme/course as KR fallback when drafts are empty", () => {
    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "M19.8",
      sections,
      catalog,
      catalogQuery: { ids: ["med-1"], names: ["Мидокалм Лонг"] },
    });

    const item = view.drugItems[0];
    assert.equal(item.scheme, "1 раз в сутки");
    assert.equal(item.course, "14 дней");
    assert.equal(item.medicationDetails?.schemeDraft, "");
    assert.equal(item.medicationDetails?.courseDraft, "");
    assert.equal(item.medicationDetails?.originalScheme, "1 раз в сутки");
  });

  it("does not mark selected when only drafts/intake change", () => {
    const view = adaptDirectoryCartToMiniCart({
      diagnosisTitle: "M19.8",
      sections,
      catalog,
      catalogQuery: { ids: ["med-1"], names: ["Мидокалм Лонг"] },
      assignment: {
        medicationDrafts: {
          "med-1": { dose: "450 мг", form: "ТАБЛЕТКИ", scheme: "x", course: "y" },
        },
        medicationIntake: {
          "med-1": {
            morning: true,
            day: false,
            evening: false,
            night: false,
            relation: "",
          },
        },
        combinations: {},
        itemStates: {
          "med-1": { checked: false, comment: "" },
        },
      },
    });

    assert.equal(view.drugItems[0]?.selected, false);
    assert.equal(view.drugItems[0]?.selectedDose, "450 мг");
  });
});

describe("drug-details navigation model", () => {
  it("switches between list and drug-details without URL", () => {
    let view: MiniCartView = { type: "list" };
    view = { type: "drug-details", itemId: "med-1" };
    assert.equal(view.type, "drug-details");
    if (view.type === "drug-details") {
      assert.equal(view.itemId, "med-1");
    }
    view = { type: "list" };
    assert.equal(view.type, "list");
  });
});

describe("drug-details assignment ops flags", () => {
  it("exposes intake/reset/applyOriginal/infoComment when wired", () => {
    const flags = miniCartOpFlags({
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      setMedicationIntake: () => undefined,
      setMedicationInfoComment: () => undefined,
      resetMedicationAssignment: () => undefined,
      applyOriginalRecommendation: () => undefined,
    });

    assert.equal(flags.canIntake, true);
    assert.equal(flags.canInfoComment, true);
    assert.equal(flags.canResetAssignment, true);
    assert.equal(flags.canApplyOriginal, true);
  });
});

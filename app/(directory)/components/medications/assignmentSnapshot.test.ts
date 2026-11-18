import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_MEDICATION_INTAKE } from "./assignmentScheme";
import {
  EMPTY_ASSIGNMENT_SNAPSHOT,
  hasIndividualAssignmentClarifications,
} from "./assignmentSnapshot";

describe("hasIndividualAssignmentClarifications", () => {
  it("не показывает индикатор без пользовательских правок", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", EMPTY_ASSIGNMENT_SNAPSHOT),
      false,
    );
  });

  it("не считает выбором МНН/торгового наименования индивидуальным уточнением", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        medicationDrafts: {
          "item-1": {
            inn: "Амоксициллин",
            trade: "Флемоксин",
            recordId: "r1",
          },
        },
      }),
      false,
    );
  });

  it("появляется после ручного изменения дозы", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        medicationDrafts: {
          "item-1": { dose: "500 мг" },
        },
      }),
      true,
    );
  });

  it("не считает автоподстановку дозы и формы индивидуальным уточнением", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        medicationDrafts: {
          "item-1": {
            trade: "Ребагит",
            dose: "100 мг",
            form: "ТАБЛЕТКИ",
            doseSource: "catalog-auto",
            formSource: "catalog-auto",
          },
        },
      }),
      false,
    );
  });

  it("появляется после изменения параметров приёма", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        medicationIntake: {
          "item-1": { ...EMPTY_MEDICATION_INTAKE, morning: true },
        },
      }),
      true,
    );
  });

  it("появляется после пользовательского комментария", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        commentSources: { "item-1": "user" },
      }),
      true,
    );
  });

  it("исчезает, когда параметры возвращены к исходным", () => {
    assert.equal(
      hasIndividualAssignmentClarifications("item-1", {
        ...EMPTY_ASSIGNMENT_SNAPSHOT,
        medicationDrafts: {
          "item-1": {
            inn: "Амоксициллин",
            trade: "Флемоксин",
            dose: "",
            form: "",
            scheme: "",
            course: "",
          },
        },
        medicationIntake: {
          "item-1": { ...EMPTY_MEDICATION_INTAKE },
        },
        commentSources: { "item-1": "none" },
      }),
      false,
    );
  });
});

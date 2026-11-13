import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { miniCartOpFlags, type MiniCartAssignmentOps } from "./assignmentOps";

describe("miniCartOpFlags", () => {
  it("marks directory-backed mode only when ops are provided", () => {
    assert.equal(miniCartOpFlags(null).isDirectoryBacked, false);
    assert.equal(miniCartOpFlags(undefined).isDirectoryBacked, false);

    const ops: MiniCartAssignmentOps = {
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      selectAllRequiredDiagnostics: () => undefined,
    };

    const flags = miniCartOpFlags(ops);
    assert.equal(flags.isDirectoryBacked, true);
    assert.equal(flags.canToggle, true);
    assert.equal(flags.canComment, true);
    assert.equal(flags.canTrade, true);
    assert.equal(flags.canEditFields, true);
    assert.equal(flags.canSelectAllRequired, true);
    assert.equal(flags.canScheme, false);
  });

  it("enables canScheme when applyCombination is provided", () => {
    const ops: MiniCartAssignmentOps = {
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      applyCombination: () => undefined,
    };

    assert.equal(miniCartOpFlags(ops).canScheme, true);
  });

  it("exposes drug-details ops independently", () => {
    const flags = miniCartOpFlags({
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      setMedicationIntake: () => undefined,
      resetMedicationAssignment: () => undefined,
    });

    assert.equal(flags.canIntake, true);
    assert.equal(flags.canResetAssignment, true);
    assert.equal(flags.canInfoComment, false);
    assert.equal(flags.canApplyOriginal, false);
  });

  it("exposes D3 custom item and recommendation ops", () => {
    const flags = miniCartOpFlags({
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      addCustomItem: () => undefined,
      updateCustomItem: () => undefined,
      removeCustomItem: () => undefined,
      setGeneralRecommendation: () => undefined,
    });

    assert.equal(flags.canAddCustomItem, true);
    assert.equal(flags.canUpdateCustomItem, true);
    assert.equal(flags.canRemoveCustomItem, true);
    assert.equal(flags.canSetRecommendation, true);
    assert.equal(flags.canCopy, false);
    assert.equal(flags.isDirectoryBacked, true);
  });

  it("enables canCopy only when copySelected is provided", () => {
    const flags = miniCartOpFlags({
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: () => undefined,
      copySelected: () => Promise.resolve({ itemsCount: 0 }),
    });

    assert.equal(flags.canCopy, true);
  });
});

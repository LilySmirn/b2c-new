/**
 * Контракт автовыбора при ручном редактировании назначения:
 * select по умолчанию true; экран/карточка деталей передаёт select:false
 * и выбирает препарат только на «Готово» при edited=true.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MiniCartAssignmentOps } from "./assignmentOps";

describe("select on assignment edit contract", () => {
  it("setMedicationField accepts optional select flag", () => {
    const calls: Array<{
      itemId: string;
      field: string;
      value: string;
      options?: { select?: boolean };
    }> = [];

    const ops: MiniCartAssignmentOps = {
      toggleItem: () => undefined,
      setComment: () => undefined,
      applyMedsPick: () => undefined,
      setMedicationField: (itemId, field, value, options) => {
        calls.push({ itemId, field, value, options });
      },
    };

    ops.setMedicationField("med-1", "dose", "20 мг");
    ops.setMedicationField("med-1", "course", "7 дней", { select: false });

    assert.equal(calls.length, 2);
    assert.equal(calls[0]?.options, undefined);
    assert.deepEqual(calls[1]?.options, { select: false });
  });
});

/**
 * Снимок локального состояния назначений PrescriptionChecklist
 * для отображения в мини-корзинке (то же React-дерево, без второго store).
 */

import {
  assignmentFromDraft,
  hasCustomAssignment,
  type AssignmentCommentSource,
  type MedicationIntake,
} from "./assignmentScheme";
import type { CombinationDraft } from "./combinationSelection";

export type MedicationFieldDraft = {
  dose?: string;
  form?: string;
  scheme?: string;
  course?: string;
  inn?: string;
  trade?: string;
  recordId?: string;
};

export type ChecklistItemUiState = {
  checked: boolean;
  comment: string;
};

export type ChecklistAssignmentSnapshot = {
  medicationDrafts: Record<string, MedicationFieldDraft>;
  medicationIntake: Record<string, MedicationIntake>;
  combinations: Record<string, CombinationDraft>;
  /** Живые checked/comment по id позиции (включая sourceIds). */
  itemStates: Record<string, ChecklistItemUiState>;
  /** Происхождение комментария: user / clinical-recommendation / none. */
  commentSources?: Record<string, AssignmentCommentSource>;
};

export const EMPTY_ASSIGNMENT_SNAPSHOT: ChecklistAssignmentSnapshot = {
  medicationDrafts: {},
  medicationIntake: {},
  combinations: {},
  itemStates: {},
  commentSources: {},
};

export type AssignmentClarificationLookup = Pick<
  ChecklistAssignmentSnapshot,
  "medicationDrafts" | "medicationIntake" | "commentSources"
>;

/**
 * Есть ли у позиции КР ручные уточнения (доза/форма/приём/схема/курс/комментарий).
 * Выбор МНН/торгового наименования сам по себе не считается.
 */
export const hasIndividualAssignmentClarifications = (
  itemId: string,
  assignment: AssignmentClarificationLookup,
): boolean => {
  const fields = assignmentFromDraft(
    assignment.medicationDrafts[itemId],
    assignment.medicationIntake[itemId],
  );

  if (hasCustomAssignment(fields)) return true;

  return assignment.commentSources?.[itemId] === "user";
};

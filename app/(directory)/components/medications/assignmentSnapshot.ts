/**
 * Снимок локального состояния назначений PrescriptionChecklist
 * для отображения в мини-корзинке (то же React-дерево, без второго store).
 */

import type {
  AssignmentCommentSource,
  MedicationIntake,
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

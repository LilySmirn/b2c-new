/**
 * Операции изменения назначений полноразмерной корзины из мини-корзинки.
 * Реализуются в PrescriptionChecklist; мини-корзинка только вызывает их.
 */

import type { CombinationDraft } from "@/app/(directory)/components/medications/combinationSelection";

export type MiniCartMedsField = "dose" | "form" | "scheme" | "course";

export type MiniCartMedsPick = {
  inn?: string;
  trade?: string;
  dose?: string;
  form?: string;
};

export type { CombinationDraft as MiniCartCombinationDraft };

export type MiniCartAssignmentOps = {
  /** D1: выбор / снятие выбора позиции по стабильному id. */
  toggleItem: (itemId: string) => void;
  /** D1: комментарий к позиции (пустая строка = очистить). */
  setComment: (itemId: string, comment: string) => void;
  /**
   * D1/D2: МНН / торговое / доза / форма через applyMedsSelection.
   * Для обычных препаратов (kind trade) и групп (kind alternatives).
   */
  applyMedsPick: (itemId: string, pick: MiniCartMedsPick) => void;
  /** D1/D2: текстовые поля назначения (dose/form через applyMedsSelection). */
  setMedicationField: (itemId: string, field: MiniCartMedsField, value: string) => void;
  /** D1: «выбрать всю обязательную диагностику». */
  selectAllRequiredDiagnostics?: () => void;
  /**
   * D2: подтверждение схемы/комбинации через confirmCombination.
   * Черновик мастера локален в модалке; в корзину пишется только после Готово.
   */
  applyCombination?: (itemId: string, draft: CombinationDraft) => void;
};

/** Какие действия доступны при частичном подключении ops. */
export const miniCartOpFlags = (ops?: MiniCartAssignmentOps | null) => ({
  canToggle: Boolean(ops?.toggleItem),
  canComment: Boolean(ops?.setComment),
  canTrade: Boolean(ops?.applyMedsPick),
  canEditFields: Boolean(ops?.setMedicationField),
  canSelectAllRequired: Boolean(ops?.selectAllRequiredDiagnostics),
  canScheme: Boolean(ops?.applyCombination),
  /** Внешнее управление назначениями (не demo local state). */
  isDirectoryBacked: Boolean(ops),
});

/**
 * Операции изменения назначений полноразмерной корзины из мини-корзинки.
 * Реализуются в PrescriptionChecklist / SideCart; мини-корзинка только вызывает их.
 */

import type { MedicationIntake } from "@/app/(directory)/components/medications/assignmentScheme";
import type { CombinationDraft } from "@/app/(directory)/components/medications/combinationSelection";

export type MiniCartMedsField = "dose" | "form" | "scheme" | "course";

export type MiniCartMedsPick = {
  inn?: string;
  trade?: string;
  dose?: string;
  form?: string;
};

export type MiniCartCustomItemValues = {
  name: string;
  comment: string;
};

export type { CombinationDraft as MiniCartCombinationDraft };
export type { MedicationIntake as MiniCartMedicationIntake };

export type MiniCartAssignmentOps = {
  /** D1: выбор / снятие выбора позиции по стабильному id. */
  toggleItem: (itemId: string) => void;
  /**
   * D1: комментарий к позиции (пустая строка = очистить).
   * Автоматически отмечает позицию выбранной при непустом комментарии
   * (как setItemComment в таблице).
   */
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
  /**
   * Экран препарата: приём (утро/день/вечер/ночь + отношение к еде).
   * Не устанавливает checked.
   */
  setMedicationIntake?: (itemId: string, intake: MedicationIntake) => void;
  /**
   * Экран препарата: комментарий как в DrugInfoModal
   * (без авто-check, с пометкой source=user).
   */
  setMedicationInfoComment?: (itemId: string, comment: string) => void;
  /** Сброс параметров назначения (как DrugInfoModal «Сбросить»). */
  resetMedicationAssignment?: (itemId: string) => void;
  /** Подставить схему/курс из КР (как «Подставить в назначение»). */
  applyOriginalRecommendation?: (itemId: string) => void;
  /**
   * D3: пользовательская услуга/медикамент (SideCart + cartStorage).
   * id создаётся в SideCart через createBrowserId.
   */
  addCustomItem?: (values: MiniCartCustomItemValues) => void;
  /** D3: обновить существующую пользовательскую позицию, сохранив id. */
  updateCustomItem?: (id: string, values: MiniCartCustomItemValues) => void;
  /** D3: удалить пользовательскую позицию (без подтверждения, как в SideCart). */
  removeCustomItem?: (id: string) => void;
  /**
   * D3: общая рекомендация для пациента.
   * Как RecommendationField в SideCart — запись на каждый ввод.
   */
  setGeneralRecommendation?: (value: string) => void;
};

/** Какие действия доступны при частичном подключении ops. */
export const miniCartOpFlags = (ops?: MiniCartAssignmentOps | null) => ({
  canToggle: Boolean(ops?.toggleItem),
  canComment: Boolean(ops?.setComment),
  canTrade: Boolean(ops?.applyMedsPick),
  canEditFields: Boolean(ops?.setMedicationField),
  canSelectAllRequired: Boolean(ops?.selectAllRequiredDiagnostics),
  canScheme: Boolean(ops?.applyCombination),
  canIntake: Boolean(ops?.setMedicationIntake),
  canInfoComment: Boolean(ops?.setMedicationInfoComment),
  canResetAssignment: Boolean(ops?.resetMedicationAssignment),
  canApplyOriginal: Boolean(ops?.applyOriginalRecommendation),
  canAddCustomItem: Boolean(ops?.addCustomItem),
  canUpdateCustomItem: Boolean(ops?.updateCustomItem),
  canRemoveCustomItem: Boolean(ops?.removeCustomItem),
  canSetRecommendation: Boolean(ops?.setGeneralRecommendation),
  /** Внешнее управление назначениями (не demo local state). */
  isDirectoryBacked: Boolean(ops),
});

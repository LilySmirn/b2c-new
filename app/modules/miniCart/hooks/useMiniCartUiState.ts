"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EMPTY_MEDICATION_INTAKE,
  type MedicationIntake,
} from "@/app/(directory)/components/medications/assignmentScheme";
import type { CombinationDraft } from "@/app/(directory)/components/medications/combinationSelection";
import {
  buildStoredCustomCartItem,
  mergeCustomCartItemValues,
  type CustomCartItemValues,
} from "@/app/(directory)/shared/cart";
import {
  miniCartOpFlags,
  type MiniCartAssignmentOps,
} from "../assignmentOps";
import {
  DEFAULT_MINI_CART_NAV,
  isMiniCartNavEnabled,
  resolveMiniCartNav,
} from "../navFlags";
import {
  miniCartTabPageForId,
  resolveMiniCartOpeningTabId,
} from "../openingTab";
import type {
  MiniCartAge,
  MiniCartCatalogItem,
  MiniCartComponentPick,
  MiniCartCustomItem,
  MiniCartNav,
  MiniCartShellTab,
  MiniCartTab,
  MiniCartView,
  MiniCartVisit,
} from "../types";

export type MiniCartUiStateArgs = {
  initialTabs: MiniCartTab[];
  initialDrugItems: MiniCartCatalogItem[];
  initialClassicItems: MiniCartCatalogItem[];
  shellTabs: Record<string, MiniCartShellTab>;
  initiallyOpen?: boolean;
  recommendationText?: string;
  /** Directory-backed: зеркало SideCart / cartStorage. */
  customItems?: readonly MiniCartCustomItem[];
  assignmentOps?: MiniCartAssignmentOps;
  /**
   * При смене ключа сбрасываем локальный UI (вкладки, оверлеи, scroll),
   * не трогая режим PiP (он живёт снаружи).
   */
  contentKey?: string;
};

export function useMiniCartUiState({
  initialTabs,
  initialDrugItems,
  initialClassicItems,
  shellTabs,
  initiallyOpen = true,
  recommendationText,
  customItems: customItemsProp,
  assignmentOps,
  contentKey,
}: MiniCartUiStateArgs) {
  const flags = miniCartOpFlags(assignmentOps);
  const activeFromTabs =
    initialTabs.find((tab) => tab.active)?.id ??
    initialTabs.find((tab) => tab.enabled)?.id ??
    "drugs";

  const [open, setOpen] = useState(initiallyOpen);
  const [docked, setDocked] = useState(false);
  const [miniNav, setMiniNavState] = useState<MiniCartNav>(DEFAULT_MINI_CART_NAV);
  const [activeTab, setActiveTab] = useState(activeFromTabs);
  const [miniTabPage, setMiniTabPage] = useState(
    initialTabs.findIndex((tab) => tab.id === activeFromTabs) >= 4 ? 1 : 0,
  );
  const [drugItems, setDrugItems] = useState(initialDrugItems);
  const [classicItems, setClassicItems] = useState(initialClassicItems);
  const [mkbQuery, setMkbQuery] = useState("");
  const [mkbSearchOpen, setMkbSearchOpen] = useState(false);
  const [mkbVisit, setMkbVisit] = useState<MiniCartVisit>("primary");
  const [mkbAge, setMkbAge] = useState<MiniCartAge>("adult");
  const [recommendation, setRecommendation] = useState(
    () => recommendationText ?? "",
  );
  const [noteTargetId, setNoteTargetId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  /** Информационное окно для non-drug (диагностика / лечение). */
  const [infoTargetId, setInfoTargetId] = useState<string | null>(null);
  /**
   * Начальный фокус карточки назначения.
   * `"comment"` — только при открытии через поле «Комментарий» в списке.
   */
  const [detailsInitialFocus, setDetailsInitialFocus] = useState<
    "comment" | null
  >(null);
  /** Внутренние экраны: list | drug-details | custom-items. */
  const [view, setView] = useState<MiniCartView>({ type: "list" });
  const [listScrollTop, setListScrollTop] = useState(0);
  const [tradeTargetId, setTradeTargetId] = useState<string | null>(null);
  const [schemeTargetId, setSchemeTargetId] = useState<string | null>(null);
  const [comboTargetId, setComboTargetId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  /** null = создание; string = редактирование пользовательской позиции. */
  const [editingCustomItemId, setEditingCustomItemId] = useState<string | null>(
    null,
  );
  const [localCustomItems, setLocalCustomItems] = useState<MiniCartCustomItem[]>(
    [],
  );
  const [customSeq, setCustomSeq] = useState(1);
  const [aiInput, setAiInput] = useState("");
  const [ixQuery, setIxQuery] = useState("");

  const customItems = flags.isDirectoryBacked
    ? (customItemsProp ?? [])
    : localCustomItems;

  useEffect(() => {
    setDrugItems(initialDrugItems);
    setClassicItems(initialClassicItems);
  }, [initialClassicItems, initialDrugItems]);

  useEffect(() => {
    if (recommendationText === undefined) return;
    setRecommendation(recommendationText);
  }, [recommendationText]);

  /** Сброс локального UI при смене КР (contentKey), без remount Host. */
  const contentKeyRef = useRef<string | undefined>(contentKey);
  useEffect(() => {
    if (contentKey === undefined) return;
    if (contentKeyRef.current === contentKey) return;
    contentKeyRef.current = contentKey;

    const nextActive =
      initialTabs.find((tab) => tab.active)?.id ??
      initialTabs.find((tab) => tab.enabled)?.id ??
      "drugs";
    setActiveTab(nextActive);
    setMiniTabPage(
      initialTabs.findIndex((tab) => tab.id === nextActive) >= 4 ? 1 : 0,
    );
    setMiniNavState(DEFAULT_MINI_CART_NAV);
    setMkbQuery("");
    setMkbSearchOpen(false);
    setNoteTargetId(null);
    setNoteDraft("");
    setInfoTargetId(null);
    setDetailsInitialFocus(null);
    setView({ type: "list" });
    setListScrollTop(0);
    setTradeTargetId(null);
    setSchemeTargetId(null);
    setComboTargetId(null);
    setAddModalOpen(false);
    setEditingCustomItemId(null);
    setAiInput("");
    setIxQuery("");
    // Только при смене contentKey — не при каждом обновлении tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  /** Если в сохранённом состоянии активна скрытая вкладка — переключаемся на КР. */
  useEffect(() => {
    if (!isMiniCartNavEnabled(miniNav)) {
      setMiniNavState(DEFAULT_MINI_CART_NAV);
    }
  }, [miniNav]);

  const setMiniNav = (nav: MiniCartNav) => {
    setMiniNavState(resolveMiniCartNav(nav));
  };

  const tabs = useMemo(
    () =>
      initialTabs.map((tab) => {
        if (tab.id === "drugs") {
          return { ...tab, enabled: tab.enabled !== false };
        }
        const shell = shellTabs[tab.id];
        if (shell && typeof shell.enabled === "boolean") {
          return { ...tab, enabled: shell.enabled };
        }
        return tab;
      }),
    [initialTabs, shellTabs],
  );

  /**
   * Синхронно выставить вкладку при открытии мини-корзинки (до первого paint).
   * Не двусторонняя синхронизация — только стартовое значение сеанса.
   */
  const applyOpeningTab = useCallback(
    (preferredTabId?: string | null) => {
      const resolved = resolveMiniCartOpeningTabId(tabs, preferredTabId);
      setActiveTab(resolved);
      setMiniTabPage(miniCartTabPageForId(tabs, resolved));
      setMiniNavState(DEFAULT_MINI_CART_NAV);
    },
    [tabs],
  );

  const toggleItem = (itemId: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canToggle) return;
      assignmentOps?.toggleItem(itemId);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item,
      ),
    );
    setClassicItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const updateComment = (itemId: string, comment: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canComment) return;
      assignmentOps?.setComment(itemId, comment);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, commentShort: comment } : item,
      ),
    );
    setClassicItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, commentText: comment } : item,
      ),
    );
  };

  const applyTrade = (
    itemId: string,
    pick: { inn: string; trade: string; dose?: string; form?: string },
  ) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canTrade) return;
      // Как в полноразмерной корзине: draft + явный checked=true (не toggle).
      // MiniCartTradePopover вызывает onPick только на финальном выборе
      // (торговое наименование или МНН без торговых имён).
      assignmentOps?.applyMedsPick(itemId, pick);
      assignmentOps?.setItemChecked?.(itemId, true);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selectedInn: pick.inn,
              selectedTrade: pick.trade,
              selectedDose: pick.dose || item.selectedDose || "",
              selectedForm: pick.form || item.selectedForm || "",
              selected: true,
            }
          : item,
      ),
    );
  };

  const selectItem = (itemId: string) => {
    if (flags.isDirectoryBacked) {
      assignmentOps?.setItemChecked?.(itemId, true);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, selected: true } : item,
      ),
    );
  };

  const setMedicationField = (
    itemId: string,
    field: "dose" | "form" | "scheme" | "course",
    value: string,
    options?: { select?: boolean },
  ) => {
    const select = options?.select !== false;
    if (flags.isDirectoryBacked) {
      if (!flags.canEditFields) return;
      assignmentOps?.setMedicationField(itemId, field, value, options);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const details = item.medicationDetails;
        const previous =
          field === "dose"
            ? item.selectedDose || ""
            : field === "form"
              ? item.selectedForm || ""
              : field === "scheme"
                ? details?.schemeDraft || item.scheme || ""
                : details?.courseDraft || item.course || "";
        const changed = previous !== value;
        let next = item;
        if (field === "dose") next = { ...item, selectedDose: value };
        else if (field === "form") next = { ...item, selectedForm: value };
        else if (field === "scheme") {
          next = {
            ...item,
            scheme: value,
            medicationDetails: details
              ? { ...details, schemeDraft: value }
              : details,
          };
        } else {
          next = {
            ...item,
            course: value,
            medicationDetails: details
              ? { ...details, courseDraft: value }
              : details,
          };
        }
        if (select && changed) next = { ...next, selected: true };
        return next;
      }),
    );
  };

  const setMedicationIntake = (itemId: string, intake: MedicationIntake) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canIntake) return;
      assignmentOps?.setMedicationIntake?.(itemId, intake);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const details = item.medicationDetails;
        return {
          ...item,
          medicationDetails: details
            ? { ...details, intake }
            : {
                description: item.hint || "",
                infoComment: "",
                originalScheme: item.scheme || "",
                originalCourse: item.course || "",
                schemeDraft: "",
                courseDraft: "",
                intake,
                noteCustom: false,
                doseOptions: [],
                formOptions: [],
                combination: null,
              },
        };
      }),
    );
  };

  const setMedicationInfoComment = (itemId: string, comment: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canInfoComment) return;
      assignmentOps?.setMedicationInfoComment?.(itemId, comment);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              commentText: comment,
              commentShort: comment,
              medicationDetails: item.medicationDetails
                ? { ...item.medicationDetails, noteCustom: true }
                : item.medicationDetails,
            }
          : item,
      ),
    );
  };

  const resetMedicationAssignment = (itemId: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canResetAssignment) return;
      assignmentOps?.resetMedicationAssignment?.(itemId);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const details = item.medicationDetails;
        return {
          ...item,
          selectedDose: "",
          selectedForm: "",
          scheme: details?.originalScheme || item.scheme || "",
          course: details?.originalCourse || item.course || "",
          medicationDetails: details
            ? {
                ...details,
                schemeDraft: "",
                courseDraft: "",
                intake: { ...EMPTY_MEDICATION_INTAKE },
                noteCustom: false,
              }
            : details,
        };
      }),
    );
  };

  const applyOriginalRecommendation = (itemId: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canApplyOriginal) return;
      assignmentOps?.applyOriginalRecommendation?.(itemId);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const details = item.medicationDetails;
        return {
          ...item,
          selectedDose: "",
          selectedForm: "",
          scheme: details?.originalScheme || item.scheme || "",
          course: details?.originalCourse || item.course || "",
          medicationDetails: details
            ? {
                ...details,
                schemeDraft: "",
                courseDraft: "",
                intake: { ...EMPTY_MEDICATION_INTAKE },
              }
            : details,
        };
      }),
    );
  };

  const openDrugDetails = (
    itemId: string,
    scrollTop = 0,
    options?: { focusComment?: boolean },
  ) => {
    setListScrollTop(scrollTop);
    setDetailsInitialFocus(options?.focusComment ? "comment" : null);
    setView({ type: "drug-details", itemId });
    setInfoTargetId(null);
    setNoteTargetId(null);
  };

  const openCustomItemsScreen = (scrollTop = 0) => {
    setListScrollTop(scrollTop);
    setView({ type: "custom-items" });
  };

  /** Закрыть любой внутренний экран и вернуться к основному списку. */
  const closeInnerView = () => {
    setView({ type: "list" });
    setDetailsInitialFocus(null);
  };

  const closeDrugDetails = closeInnerView;

  const closeInfoModal = () => {
    setInfoTargetId(null);
    setDetailsInitialFocus(null);
  };

  const applySchemePicks = (
    itemId: string,
    picks: Record<string, MiniCartComponentPick>,
  ) => {
    if (flags.isDirectoryBacked) return;
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              componentPicks: picks,
              selected: true,
              selectedTrade: Object.values(picks)
                .map((pick) => pick.trade || pick.inn)
                .filter(Boolean)
                .join(" + "),
            }
          : item,
      ),
    );
  };

  const applyCombination = (itemId: string, draft: CombinationDraft) => {
    if (!flags.isDirectoryBacked || !flags.canScheme) return;
    assignmentOps?.applyCombination?.(itemId, draft);
  };

  const applyComboPick = (
    itemId: string,
    pick: { inn: string; trade: string },
  ) => {
    if (flags.isDirectoryBacked) return;
    setDrugItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              selectedInn: pick.inn,
              selectedTrade: pick.trade,
              selected: true,
            }
          : item,
      ),
    );
  };

  const findItem = (itemId: string) =>
    drugItems.find((item) => item.id === itemId) ||
    classicItems.find((item) => item.id === itemId) ||
    null;

  const findCustomItem = (itemId: string) =>
    customItems.find((item) => item.id === itemId) ?? null;

  const openInfoForItem = (
    itemId: string,
    scrollTop = 0,
    options?: { focusComment?: boolean },
  ) => {
    const item = findItem(itemId);
    if (!item) return;
    // Лекарственные позиции — внутренний экран, не модалка на основной вкладке.
    if (
      item.kind === "plain" ||
      item.kind === "trade" ||
      item.kind === "alternatives" ||
      item.kind === "scheme" ||
      item.kind === "combo" ||
      item.kind === "extra-drug"
    ) {
      openDrugDetails(itemId, scrollTop, options);
      return;
    }
    setDetailsInitialFocus(options?.focusComment ? "comment" : null);
    setNoteTargetId(null);
    setInfoTargetId(itemId);
  };

  /**
   * Клик по полю «Комментарий» в списке: та же карточка, что у «i»,
   * с начальным фокусом в поле комментария.
   */
  const openComment = (itemId: string, scrollTop = 0) => {
    if (flags.isDirectoryBacked && !flags.canComment) return;
    openInfoForItem(itemId, scrollTop, { focusComment: true });
  };

  const openAddCustomItem = () => {
    if (flags.isDirectoryBacked && !flags.canAddCustomItem) return;
    setEditingCustomItemId(null);
    setAddModalOpen(true);
  };

  const openCustomItemEditor = (itemId: string) => {
    const item = findCustomItem(itemId);
    if (!item) return;
    if (flags.isDirectoryBacked && !flags.canUpdateCustomItem) return;
    setEditingCustomItemId(itemId);
    setAddModalOpen(true);
  };

  const closeCustomItemModal = () => {
    setAddModalOpen(false);
    setEditingCustomItemId(null);
  };

  const saveCustomItem = (values: CustomCartItemValues) => {
    if (flags.isDirectoryBacked) {
      if (editingCustomItemId) {
        if (!flags.canUpdateCustomItem) return;
        assignmentOps?.updateCustomItem?.(editingCustomItemId, values);
      } else {
        if (!flags.canAddCustomItem) return;
        assignmentOps?.addCustomItem?.(values);
      }
      closeCustomItemModal();
      return;
    }

    if (editingCustomItemId) {
      setLocalCustomItems((prev) =>
        prev.map((item) =>
          item.id === editingCustomItemId
            ? mergeCustomCartItemValues(item, values)
            : item,
        ),
      );
    } else {
      const id = `custom-${customSeq}`;
      setCustomSeq((value) => value + 1);
      setLocalCustomItems((prev) => [
        ...prev,
        buildStoredCustomCartItem(id, values),
      ]);
    }
    closeCustomItemModal();
  };

  const removeCustomItem = (itemId: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canRemoveCustomItem) return;
      assignmentOps?.removeCustomItem?.(itemId);
      return;
    }
    setLocalCustomItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const setRecommendationValue = (value: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canSetRecommendation) return;
      setRecommendation(value);
      assignmentOps?.setGeneralRecommendation?.(value);
      return;
    }
    setRecommendation(value);
  };

  const selectAllRequired = (tabId: string) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canSelectAllRequired) return;
      if (tabId === "required-diagnostics") {
        assignmentOps?.selectAllRequiredDiagnostics?.();
      }
      return;
    }
    setClassicItems((prev) =>
      prev.map((item) =>
        item.tabId === tabId ? { ...item, selected: true } : item,
      ),
    );
  };

  /** D1/D2: trade и группы alternatives; схемы — отдельный мастер. */
  const canOpenTradePicker = (item: MiniCartCatalogItem) => {
    if (flags.isDirectoryBacked) {
      return (
        flags.canTrade &&
        (item.kind === "trade" || item.kind === "alternatives")
      );
    }
    return (
      item.kind === "alternatives" ||
      item.kind === "trade" ||
      item.kind === "extra-drug"
    );
  };

  const canOpenSchemePicker = (item: MiniCartCatalogItem) => {
    if (flags.isDirectoryBacked) {
      return flags.canScheme && item.kind === "scheme";
    }
    return item.kind === "scheme";
  };

  const canOpenComboPicker = (item: MiniCartCatalogItem) => {
    if (flags.isDirectoryBacked) return false;
    return item.kind === "combo";
  };

  const canEditItemFields = (item: MiniCartCatalogItem) => {
    if (flags.isDirectoryBacked) {
      return (
        flags.canEditFields &&
        (item.kind === "trade" ||
          item.kind === "plain" ||
          item.kind === "alternatives" ||
          item.kind === "extra-drug" ||
          item.kind === "scheme")
      );
    }
    return true;
  };

  return {
    open,
    setOpen,
    docked,
    setDocked,
    miniNav: resolveMiniCartNav(miniNav),
    setMiniNav,
    activeTab,
    setActiveTab,
    applyOpeningTab,
    miniTabPage,
    setMiniTabPage,
    tabs,
    drugItems,
    classicItems,
    mkbQuery,
    setMkbQuery,
    mkbSearchOpen,
    setMkbSearchOpen,
    mkbVisit,
    setMkbVisit,
    mkbAge,
    setMkbAge,
    recommendation,
    setRecommendation: setRecommendationValue,
    noteTargetId,
    setNoteTargetId,
    noteDraft,
    setNoteDraft,
    infoTargetId,
    setInfoTargetId,
    closeInfoModal,
    detailsInitialFocus,
    view,
    setView,
    listScrollTop,
    openDrugDetails,
    closeDrugDetails,
    openCustomItemsScreen,
    closeInnerView,
    openInfoForItem,
    tradeTargetId,
    setTradeTargetId,
    schemeTargetId,
    setSchemeTargetId,
    comboTargetId,
    setComboTargetId,
    addModalOpen,
    setAddModalOpen,
    editingCustomItemId,
    openAddCustomItem,
    openCustomItemEditor,
    closeCustomItemModal,
    saveCustomItem,
    removeCustomItem,
    customItems,
    findCustomItem,
    aiInput,
    setAiInput,
    ixQuery,
    setIxQuery,
    flags,
    canOpenTradePicker,
    canOpenSchemePicker,
    canOpenComboPicker,
    canEditItemFields,
    toggleItem,
    updateComment,
    openComment,
    applyTrade,
    selectItem,
    setMedicationField,
    setMedicationIntake,
    setMedicationInfoComment,
    resetMedicationAssignment,
    applyOriginalRecommendation,
    applySchemePicks,
    applyCombination,
    applyComboPick,
    selectAllRequired,
    findItem,
  };
}

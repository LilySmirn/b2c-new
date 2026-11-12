"use client";

import { useEffect, useMemo, useState } from "react";
import type { CombinationDraft } from "@/app/(directory)/components/medications/combinationSelection";
import {
  miniCartOpFlags,
  type MiniCartAssignmentOps,
} from "../assignmentOps";
import type {
  MiniCartAge,
  MiniCartCatalogItem,
  MiniCartComponentPick,
  MiniCartNav,
  MiniCartShellTab,
  MiniCartTab,
  MiniCartVisit,
} from "../types";

export type MiniCartUiStateArgs = {
  initialTabs: MiniCartTab[];
  initialDrugItems: MiniCartCatalogItem[];
  initialClassicItems: MiniCartCatalogItem[];
  shellTabs: Record<string, MiniCartShellTab>;
  initiallyOpen?: boolean;
  recommendationText?: string;
  assignmentOps?: MiniCartAssignmentOps;
};

export function useMiniCartUiState({
  initialTabs,
  initialDrugItems,
  initialClassicItems,
  shellTabs,
  initiallyOpen = true,
  recommendationText,
  assignmentOps,
}: MiniCartUiStateArgs) {
  const flags = miniCartOpFlags(assignmentOps);
  const activeFromTabs =
    initialTabs.find((tab) => tab.active)?.id ??
    initialTabs.find((tab) => tab.enabled)?.id ??
    "drugs";

  const [open, setOpen] = useState(initiallyOpen);
  const [docked, setDocked] = useState(false);
  const [miniNav, setMiniNav] = useState<MiniCartNav>("clinical-recs");
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
  const [infoTargetId, setInfoTargetId] = useState<string | null>(null);
  const [tradeTargetId, setTradeTargetId] = useState<string | null>(null);
  const [schemeTargetId, setSchemeTargetId] = useState<string | null>(null);
  const [comboTargetId, setComboTargetId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [customSeq, setCustomSeq] = useState(1);
  const [aiInput, setAiInput] = useState("");
  const [ixQuery, setIxQuery] = useState("");

  useEffect(() => {
    setDrugItems(initialDrugItems);
    setClassicItems(initialClassicItems);
  }, [initialClassicItems, initialDrugItems]);

  useEffect(() => {
    if (recommendationText === undefined) return;
    setRecommendation(recommendationText);
  }, [recommendationText]);

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
      assignmentOps?.applyMedsPick(itemId, pick);
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

  const setMedicationField = (
    itemId: string,
    field: "dose" | "form" | "scheme" | "course",
    value: string,
  ) => {
    if (flags.isDirectoryBacked) {
      if (!flags.canEditFields) return;
      assignmentOps?.setMedicationField(itemId, field, value);
      return;
    }
    setDrugItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (field === "dose") return { ...item, selectedDose: value };
        if (field === "form") return { ...item, selectedForm: value };
        if (field === "scheme") return { ...item, scheme: value };
        return { ...item, course: value };
      }),
    );
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

  const openComment = (itemId: string) => {
    if (flags.isDirectoryBacked && !flags.canComment) return;
    const item = findItem(itemId);
    setNoteDraft(item?.commentShort || item?.commentText || "");
    setNoteTargetId(itemId);
  };

  const addCustomItem = (name: string) => {
    if (flags.isDirectoryBacked) return;
    const id = `custom-${customSeq}`;
    setCustomSeq((value) => value + 1);
    setClassicItems((prev) => [
      ...prev,
      {
        id,
        kind: "custom",
        name,
        selected: true,
        commentText: "",
        tabId: "lifestyle",
        group: "Прочее",
      },
    ]);
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
          item.kind === "extra-drug")
      );
    }
    return true;
  };

  return {
    open,
    setOpen,
    docked,
    setDocked,
    miniNav,
    setMiniNav,
    activeTab,
    setActiveTab,
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
    setRecommendation,
    noteTargetId,
    setNoteTargetId,
    noteDraft,
    setNoteDraft,
    infoTargetId,
    setInfoTargetId,
    tradeTargetId,
    setTradeTargetId,
    schemeTargetId,
    setSchemeTargetId,
    comboTargetId,
    setComboTargetId,
    addModalOpen,
    setAddModalOpen,
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
    setMedicationField,
    applySchemePicks,
    applyCombination,
    applyComboPick,
    addCustomItem,
    selectAllRequired,
    findItem,
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
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
  assignmentsReadOnly?: boolean;
};

export function useMiniCartUiState({
  initialTabs,
  initialDrugItems,
  initialClassicItems,
  shellTabs,
  initiallyOpen = true,
  recommendationText,
  assignmentsReadOnly = false,
}: MiniCartUiStateArgs) {
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

  // Подхват секций/каталога/назначений без remount Shell (PiP остаётся открытым).
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
    if (assignmentsReadOnly) return;
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
    if (assignmentsReadOnly) return;
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
    if (assignmentsReadOnly) return;
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

  const applySchemePicks = (
    itemId: string,
    picks: Record<string, MiniCartComponentPick>,
  ) => {
    if (assignmentsReadOnly) return;
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

  const applyComboPick = (
    itemId: string,
    pick: { inn: string; trade: string },
  ) => {
    if (assignmentsReadOnly) return;
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
    if (assignmentsReadOnly) {
      // Только просмотр: открываем note с текущим текстом без сохранения.
      const item = findItem(itemId);
      setNoteDraft(item?.commentShort || item?.commentText || "");
      setNoteTargetId(itemId);
      return;
    }
    const item = findItem(itemId);
    setNoteDraft(item?.commentShort || item?.commentText || "");
    setNoteTargetId(itemId);
  };

  const addCustomItem = (name: string) => {
    if (assignmentsReadOnly) return;
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
    if (assignmentsReadOnly) return;
    setClassicItems((prev) =>
      prev.map((item) =>
        item.tabId === tabId ? { ...item, selected: true } : item,
      ),
    );
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
    assignmentsReadOnly,
    toggleItem,
    updateComment,
    openComment,
    applyTrade,
    applySchemePicks,
    applyComboPick,
    addCustomItem,
    selectAllRequired,
    findItem,
  };
}

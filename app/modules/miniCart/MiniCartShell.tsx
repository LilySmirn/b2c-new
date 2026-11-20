"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import MiniCartAddModal from "./components/MiniCartAddModal";
import MiniCartChartFlow, {
  type MiniCartChartBox,
  type MiniCartChartStep,
} from "./components/MiniCartChartFlow";
import MiniCartAiPanel from "./components/MiniCartAiPanel";
import MiniCartComboModal from "./components/MiniCartComboModal";
import MiniCartCustomItemsScreen from "./components/MiniCartCustomItemsScreen";
import MiniCartDock from "./components/MiniCartDock";
import MiniCartDrugDetailsScreen from "./components/MiniCartDrugDetailsScreen";
import MiniCartFooter from "./components/MiniCartFooter";
import MiniCartHeader from "./components/MiniCartHeader";
import MiniCartInfoModal from "./components/MiniCartInfoModal";
import MiniCartInteractionsPanel from "./components/MiniCartInteractionsPanel";
import MiniCartItemList from "./components/MiniCartItemList";
import MiniCartMkbSearch from "./components/MiniCartMkbSearch";
import MiniCartMkbSearchResults from "./components/MiniCartMkbSearchResults";
import MiniCartNavTabs from "./components/MiniCartNav";
import MiniCartNoteModal from "./components/MiniCartNoteModal";
import MiniCartSchemeModal from "./components/MiniCartSchemeModal";
import MiniCartSectionTabs from "./components/MiniCartSectionTabs";
import MiniCartTradePopover from "./components/MiniCartTradePopover";
import { MiniCartPortalProvider } from "./context/MiniCartPortalContext";
import { useDocumentPip } from "./hooks/useDocumentPip";
import { useMiniCartUiState } from "./hooks/useMiniCartUiState";
import {
  isLivePortalTarget,
  isPipWindowOpen,
  resizeDocumentPipWindow,
  shrinkPipToMicro,
  type PipFrameSize,
} from "./pip/documentPip";
import {
  COPY_CLIPBOARD_ERROR_MESSAGE,
  formatCopySuccessNotice,
} from "@/app/(directory)/components/cartClipboard";
import {
  getCartRecommendationKey,
  useMkbRecommendationSearch,
  type RecommendationStandard,
} from "@/app/(directory)/shared/mkb";
import type {
  MiniCartCatalogItem,
  MiniCartDisplayMode,
  MiniCartProps,
} from "./types";
import "./styles/miniCartScope.css";
import "./styles/miniCartDrugDetails.css";
import "./styles/miniCartAddModal.css";
import "./styles/miniCartCustomItems.css";
import "./styles/miniCartPipMicro.css";
import "./styles/miniCartMkbSearch.css";

/** Видимость уведомления о копировании в мини-корзинке (не PiP-window timers). */
const MINI_COPY_NOTICE_VISIBLE_MS = 2000;
/** Fade-out перед размонтированием. */
const MINI_COPY_NOTICE_FADE_MS = 220;

function flattenClassicItems(
  shellTabs: MiniCartProps["shellTabs"],
): MiniCartCatalogItem[] {
  const list: MiniCartCatalogItem[] = [];
  Object.entries(shellTabs).forEach(([tabId, shell]) => {
    (shell.groups ?? []).forEach((group) => {
      const groupKey = group.id || group.title || "";
      (group.items ?? []).forEach((row, index) => {
        if (!row?.name) return;
        list.push({
          id: row.id || `${tabId}-${index}-${row.name}`,
          kind: "classic",
          name: row.name,
          qc: row.qc || "",
          level: row.level || "",
          hint: row.hint || "",
          commentText: row.comment || "",
          commentShort: row.comment || "",
          selected: Boolean(row.selected),
          tabId,
          group: groupKey,
        });
      });
    });
  });
  return list;
}

export type MiniCartShellHandle = {
  /**
   * Вызывать только из user-gesture (click).
   * `activeTabId` — id вкладки КР мини-корзинки (не label / не index).
   */
  requestCompactFromGesture: (activeTabId?: string | null) => Promise<boolean>;
};

const MiniCartShell = forwardRef<MiniCartShellHandle, MiniCartProps>(
  function MiniCartShell(
    {
      diagnosis,
      tabs: initialTabs,
      drugItems: initialDrugItems,
      shellTabs,
      trades = {},
      className,
      initiallyOpen = false,
      displayMode: controlledMode,
      onDisplayModeChange,
      recommendationText,
      customItems: customItemsProp,
      assignmentOps,
      schemeByItemId = {},
      hideMkbSearch = false,
      contentKey,
      onSelectRecommendation,
      getPipHeightSource,
    },
    ref,
  ) {
    const classicSeed = useMemo(
      () => flattenClassicItems(shellTabs),
      [shellTabs],
    );

    const [uncontrolledMode, setUncontrolledMode] =
      useState<MiniCartDisplayMode>(() => {
        if (controlledMode) return controlledMode;
        return initiallyOpen ? "compact" : "full";
      });

    const mode = controlledMode ?? uncontrolledMode;

    const setMode = useCallback(
      (next: MiniCartDisplayMode) => {
        if (controlledMode === undefined) {
          setUncontrolledMode(next);
        }
        onDisplayModeChange?.(next);
      },
      [controlledMode, onDisplayModeChange],
    );

    const ui = useMiniCartUiState({
      initialTabs,
      initialDrugItems,
      initialClassicItems: classicSeed,
      shellTabs,
      initiallyOpen: true,
      recommendationText,
      customItems: customItemsProp,
      assignmentOps,
      contentKey,
    });

    const mkbSearch = useMkbRecommendationSearch();
    const [mkbSelectError, setMkbSelectError] = useState<string | null>(null);
    const [mkbLoadingKey, setMkbLoadingKey] = useState<string | null>(null);
    const mkbSelectRequestRef = useRef(0);
    const mkbLoadingKeyRef = useRef<string | null>(null);

    const showMkbSearch = !hideMkbSearch;
    /** Режим карточек КР: после submit кода (не при одном только фокусе). */
    const isMkbResultsMode = showMkbSearch && mkbSearch.isResultsMode;

    /** Подсказки видны при фокусе/вводе до submit. */
    const showMkbSuggestions =
      showMkbSearch &&
      ui.mkbSearchOpen &&
      !mkbSearch.isResultsMode &&
      (mkbSearch.query.trim().length > 0 ||
        mkbSearch.isSearchLoading ||
        Boolean(mkbSearch.searchError));

    const contentKeySeenRef = useRef<string | undefined>(contentKey);

    const handleMkbCancelSearch = useCallback(() => {
      mkbSelectRequestRef.current += 1;
      mkbSearch.cancelSearch();
      setMkbSelectError(null);
      setMkbLoadingKey(null);
      mkbLoadingKeyRef.current = null;
      ui.setMkbSearchOpen(false);
    }, [mkbSearch, ui]);

    const handleMkbCardSelect = useCallback(
      async (card: RecommendationStandard) => {
        if (!onSelectRecommendation) return;
        if (mkbLoadingKeyRef.current) return;

        const diagnosisTitle =
          mkbSearch.cardDiagnosisTitle ?? card.title;
        const recommendationKey = getCartRecommendationKey(
          diagnosisTitle,
          card,
        );
        const requestId = ++mkbSelectRequestRef.current;
        const isCurrent = () => requestId === mkbSelectRequestRef.current;

        mkbLoadingKeyRef.current = recommendationKey;
        setMkbLoadingKey(recommendationKey);
        setMkbSelectError(null);

        try {
          await onSelectRecommendation({ diagnosisTitle, card });
          if (!isCurrent()) return;
          mkbSearch.resetAll();
          ui.setMkbSearchOpen(false);
        } catch (error) {
          if (!isCurrent()) return;
          setMkbSelectError(
            error instanceof Error
              ? error.message
              : "Не удалось открыть рекомендацию. Попробуйте позже.",
          );
        } finally {
          if (isCurrent()) {
            mkbLoadingKeyRef.current = null;
            setMkbLoadingKey(null);
          }
        }
      },
      [mkbSearch, onSelectRecommendation, ui],
    );

    const hostRef = useRef<HTMLDivElement>(null);
    const panelMeasureRef = useRef<HTMLElement | null>(null);
    const listScrollRef = useRef<HTMLDivElement | null>(null);
    const closeOverlaysRef = useRef<() => void>(() => undefined);
    const [tradeAnchor, setTradeAnchor] = useState<HTMLElement | null>(null);
    const [fallbackRoot, setFallbackRoot] = useState<HTMLElement | null>(null);
    const [chartStep, setChartStep] = useState<MiniCartChartStep | "closed">(
      "closed",
    );
    const [chartBox, setChartBox] = useState<MiniCartChartBox | null>(null);
    const [copyNotice, setCopyNotice] = useState<{
      text: string;
      error: boolean;
      hiding: boolean;
    } | null>(null);
    /** Таймеры всегда на opener window: React-дерево там, PiP setTimeout ненадёжен. */
    const copyNoticeTimerRef = useRef<number | null>(null);
    const copyRequestRef = useRef(0);

    const clearCopyNoticeTimer = useCallback(() => {
      if (copyNoticeTimerRef.current == null) return;
      window.clearTimeout(copyNoticeTimerRef.current);
      copyNoticeTimerRef.current = null;
    }, []);

    const dismissCopyNotice = useCallback(() => {
      clearCopyNoticeTimer();
      setCopyNotice(null);
    }, [clearCopyNoticeTimer]);

    const [pipMicro, setPipMicro] = useState(false);
    const compactPipSizeRef = useRef<PipFrameSize | null>(null);
    /** Одно PiP-окно на compact и docked-микро. In-page док не держит окно. */
    const wantPip = mode === "compact" || (mode === "docked" && pipMicro);

    const {
      setNoteTargetId,
      setTradeTargetId,
      setSchemeTargetId,
      setComboTargetId,
      closeCustomItemModal,
      closeInnerView,
      closeInfoModal,
      applyOpeningTab,
    } = ui;

    const closeOverlays = useCallback(() => {
      setNoteTargetId(null);
      closeInfoModal();
      setTradeTargetId(null);
      setSchemeTargetId(null);
      setComboTargetId(null);
      closeCustomItemModal();
      setTradeAnchor(null);
      closeInnerView();
      setChartStep("closed");
    }, [
      closeCustomItemModal,
      closeInfoModal,
      closeInnerView,
      setComboTargetId,
      setNoteTargetId,
      setSchemeTargetId,
      setTradeTargetId,
    ]);
    closeOverlaysRef.current = closeOverlays;

    useEffect(() => {
      if (contentKey === undefined) return;
      if (contentKeySeenRef.current === contentKey) return;
      contentKeySeenRef.current = contentKey;

      mkbSearch.resetAll();
      setMkbSelectError(null);
      setMkbLoadingKey(null);
      mkbLoadingKeyRef.current = null;
      closeOverlaysRef.current();
      setTradeAnchor(null);
      setChartStep("closed");
      dismissCopyNotice();
      if (listScrollRef.current) {
        const list = listScrollRef.current.querySelector(
          ".preparaty__mini-panel-list",
        );
        if (list instanceof HTMLElement) list.scrollTop = 0;
      }
      // Не тащим весь search object / dismiss в deps — только смена КР.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentKey]);

    /** UI-часть «Развернуть»/«Закрыть» без pip.close() — для системного pagehide. */
    const exitToFullRef = useRef<() => void>(() => undefined);

    const pip = useDocumentPip({
      wantPip,
      getMeasureSource: () => ({
        widthEl: panelMeasureRef.current,
        heightEl: getPipHeightSource?.() ?? null,
      }),
      onPipClosedByBrowser: () => {
        // Системный Close / Back to tab: тот же UI-путь, что handleExpand/handleClose.
        // pip.close() здесь не вызывать — teardown уже идёт из pagehide.
        exitToFullRef.current();
      },
    });

    useEffect(() => {
      setFallbackRoot(hostRef.current);
    }, []);

    useEffect(() => {
      if (mode === "compact") return;
      setChartStep("closed");
      dismissCopyNotice();
    }, [dismissCopyNotice, mode]);

    const readChartBox = useCallback((): MiniCartChartBox | null => {
      const panel = panelMeasureRef.current;
      const view = panel?.ownerDocument.defaultView;
      if (!panel || !view) return null;
      const rect = panel.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: view.getComputedStyle(panel).borderRadius,
      };
    }, []);

    const closeChartFlow = useCallback(() => {
      setChartStep("closed");
    }, []);

    const openChartPrompt = useCallback(() => {
      setChartBox(readChartBox());
      setChartStep("prompt");
    }, [readChartBox]);

    const openChartContact = useCallback(() => {
      setChartStep("contact");
    }, []);

    useEffect(() => {
      if (chartStep === "closed") return;
      const panel = panelMeasureRef.current;
      const view = panel?.ownerDocument.defaultView;
      if (!view) return;
      const sync = () => {
        const next = readChartBox();
        if (next) setChartBox(next);
      };
      view.addEventListener("resize", sync);
      return () => {
        try {
          view.removeEventListener("resize", sync);
        } catch {
          /* PiP window may already be closing */
        }
      };
    }, [chartStep, readChartBox]);

    const livePipTarget =
      pip.active && isLivePortalTarget(pip.portalTarget)
        ? pip.portalTarget
        : null;
    const isPip = Boolean(livePipTarget);

    useEffect(() => {
      if (mode === "full") setPipMicro(false);
    }, [mode]);

    useEffect(() => {
      const body = pip.pipWindow?.document?.body;
      if (!body) return;
      const micro = mode === "docked" && pipMicro;
      body.classList.toggle("is-pip-micro", micro);
      // Inline background из preparePipDocument(#fff) иначе проступает белая полоса.
      body.style.background = micro ? "#202124" : "#fff";
      return () => {
        try {
          body.classList.remove("is-pip-micro");
          body.style.background = "#fff";
        } catch {
          /* PiP document may already be gone */
        }
      };
    }, [mode, pip.pipWindow, pipMicro]);

    const ownerDocument =
      (isPip && pip.pipWindow?.document) ||
      (typeof document !== "undefined"
        ? document
        : (null as unknown as Document));

    const captureListScroll = useCallback(() => {
      const list = listScrollRef.current?.querySelector(
        ".preparaty__mini-panel-list",
      );
      return list instanceof HTMLElement ? list.scrollTop : 0;
    }, []);

    const leaveDrugDetails = useCallback(() => {
      if (ui.view.type === "drug-details") {
        const itemId = ui.view.itemId;
        const item = ui.findItem(itemId);
        const raw = item?.commentText ?? "";
        const trimmed = raw.trim();
        if (trimmed !== raw) {
          ui.setMedicationInfoComment(itemId, trimmed);
        }
      }
      closeInnerView();
    }, [
      closeInnerView,
      ui.findItem,
      ui.setMedicationInfoComment,
      ui.view,
    ]);

    useEffect(() => {
      if (ui.view.type !== "drug-details") return;
      if (!ui.findItem(ui.view.itemId)) {
        closeInnerView();
      }
    }, [closeInnerView, ui.findItem, ui.view]);

    const enterCompactFromGesture = useCallback(
      async (activeTabId?: string | null) => {
        // До смены mode / первого paint compact-панели.
        applyOpeningTab(activeTabId);
        setMode("compact");
        if (!pip.supported) return false;
        return pip.openFromUserGesture();
      },
      [applyOpeningTab, pip, setMode],
    );

    useImperativeHandle(
      ref,
      () => ({
        requestCompactFromGesture: enterCompactFromGesture,
      }),
      [enterCompactFromGesture],
    );

    const exitToFull = useCallback(() => {
      dismissCopyNotice();
      closeOverlays();
      setPipMicro(false);
      setMode("full");
    }, [closeOverlays, dismissCopyNotice, setMode]);
    exitToFullRef.current = exitToFull;

    const handleMinimize = useCallback(() => {
      const win = pip.pipWindow;
      const pipOpen = Boolean(win && pip.active && isPipWindowOpen(win));
      // resizeTo до любых await: жест клика должен быть ещё жив.
      const saved = pipOpen && win ? shrinkPipToMicro(win) : null;

      dismissCopyNotice();
      closeOverlays();

      if (saved) {
        compactPipSizeRef.current = saved;
        setPipMicro(true);
        setMode("docked");
        return;
      }

      if (pipOpen) {
        // teardown(false): pagehide снят до close → onPipClosedByBrowser не вызовет exitToFull.
        pip.close();
      }
      setPipMicro(false);
      setMode("docked");
    }, [closeOverlays, dismissCopyNotice, pip, setMode]);

    const handleExpand = useCallback(() => {
      exitToFull();
      pip.close();
    }, [exitToFull, pip]);

    const handleClose = useCallback(() => {
      exitToFull();
      pip.close();
    }, [exitToFull, pip]);

    const handleRestoreDock = useCallback(() => {
      const win = pip.pipWindow;
      const saved = compactPipSizeRef.current;
      if (pipMicro && win && isPipWindowOpen(win)) {
        if (saved) resizeDocumentPipWindow(win, saved.width, saved.height);
        setPipMicro(false);
        setMode("compact");
        return;
      }

      setPipMicro(false);
      setMode("compact");
      if (pip.supported) {
        void pip.openFromUserGesture();
      }
    }, [pip, pipMicro, setMode]);

    useEffect(
      () => () => {
        clearCopyNoticeTimer();
      },
      [clearCopyNoticeTimer],
    );

    const showCopyNotice = (text: string, error: boolean) => {
      clearCopyNoticeTimer();
      // Один слой: повторный показ сбрасывает hiding и перезапускает таймер.
      setCopyNotice({ text, error, hiding: false });
      copyNoticeTimerRef.current = window.setTimeout(() => {
        setCopyNotice((current) =>
          current ? { ...current, hiding: true } : null,
        );
        copyNoticeTimerRef.current = window.setTimeout(() => {
          setCopyNotice(null);
          copyNoticeTimerRef.current = null;
        }, MINI_COPY_NOTICE_FADE_MS);
      }, MINI_COPY_NOTICE_VISIBLE_MS);
    };

    const handleCopySelected = (targetDocument: Document) => {
      const copySelected = assignmentOps?.copySelected;
      if (!copySelected) return;

      const requestId = ++copyRequestRef.current;
      void copySelected(targetDocument).then(
        (result) => {
          if (requestId !== copyRequestRef.current) return;
          showCopyNotice(formatCopySuccessNotice(result.itemsCount), false);
        },
        () => {
          if (requestId !== copyRequestRef.current) return;
          showCopyNotice(COPY_CLIPBOARD_ERROR_MESSAGE, true);
        },
      );
    };

    const showCompactPanel = mode === "compact";
    const showDock = mode === "docked";
    const showPipMicro = Boolean(showDock && pipMicro && isPip && livePipTarget);

    const noteItem = ui.noteTargetId ? ui.findItem(ui.noteTargetId) : null;
    const infoItem = ui.infoTargetId ? ui.findItem(ui.infoTargetId) : null;
    const drugDetailsItem =
      ui.view.type === "drug-details" ? ui.findItem(ui.view.itemId) : null;
    const tradeItem = ui.tradeTargetId ? ui.findItem(ui.tradeTargetId) : null;
    const schemeItem = ui.schemeTargetId ? ui.findItem(ui.schemeTargetId) : null;
    const comboItem = ui.comboTargetId ? ui.findItem(ui.comboTargetId) : null;
    const selectedDrugs = ui.drugItems.filter((item) => item.selected);
    const showDrugDetails = Boolean(drugDetailsItem);
    const showCustomItems = ui.view.type === "custom-items";
    const showInnerScreen = showDrugDetails || showCustomItems;

    const wasInnerScreenRef = useRef(false);
    useLayoutEffect(() => {
      if (showInnerScreen) {
        wasInnerScreenRef.current = true;
        return;
      }
      if (!wasInnerScreenRef.current || !listScrollRef.current) return;
      wasInnerScreenRef.current = false;
      const list = listScrollRef.current.querySelector(
        ".preparaty__mini-panel-list",
      );
      if (list instanceof HTMLElement) {
        list.scrollTop = ui.listScrollTop;
      }
    }, [showInnerScreen, ui.listScrollTop]);

    const panel = showCompactPanel ? (
      <aside
        ref={(node) => {
          panelMeasureRef.current = node;
        }}
        className={`preparaty__mini-panel${isPip ? " is-pip" : ""}${
          showDrugDetails ? " is-drug-details" : ""
        }${showCustomItems ? " is-custom-items" : ""}`}
        aria-label="Миникорзинка"
      >
        <MiniCartHeader
          diagnosis={diagnosis}
          onMinimize={handleMinimize}
          onExpand={handleExpand}
          onClose={handleClose}
        />

        {showDrugDetails && drugDetailsItem ? (
          <MiniCartDrugDetailsScreen
            item={drugDetailsItem}
            editable={ui.canEditItemFields(drugDetailsItem)}
            canToggle={!ui.flags.isDirectoryBacked || ui.flags.canToggle}
            canReset={
              !ui.flags.isDirectoryBacked || ui.flags.canResetAssignment
            }
            canApplyOriginal={
              !ui.flags.isDirectoryBacked || ui.flags.canApplyOriginal
            }
            canOpenScheme={ui.canOpenSchemePicker(drugDetailsItem)}
            schemeLocked={ui.schemeTargetId === drugDetailsItem.id}
            initialFocus={ui.detailsInitialFocus}
            onBack={leaveDrugDetails}
            onDone={(result) => {
              if (result?.edited) {
                ui.selectItem(drugDetailsItem.id);
              }
              leaveDrugDetails();
            }}
            onToggleInclude={() => ui.toggleItem(drugDetailsItem.id)}
            onChangeField={(field, value) =>
              ui.setMedicationField(drugDetailsItem.id, field, value, {
                select: false,
              })
            }
            onCommentChange={(value) =>
              ui.setMedicationInfoComment(drugDetailsItem.id, value)
            }
            onIntakeChange={(intake) =>
              ui.setMedicationIntake(drugDetailsItem.id, intake)
            }
            onReset={() => ui.resetMedicationAssignment(drugDetailsItem.id)}
            onApplyOriginal={() =>
              ui.applyOriginalRecommendation(drugDetailsItem.id)
            }
            onOpenScheme={() => {
              if (!ui.canOpenSchemePicker(drugDetailsItem)) return;
              if (
                ui.flags.isDirectoryBacked &&
                !(schemeByItemId[drugDetailsItem.id]?.components?.length > 0)
              ) {
                return;
              }
              ui.setSchemeTargetId(drugDetailsItem.id);
            }}
          />
        ) : showCustomItems ? (
          <MiniCartCustomItemsScreen
            items={ui.customItems}
            canAdd={
              !ui.flags.isDirectoryBacked || ui.flags.canAddCustomItem
            }
            canEdit={
              !ui.flags.isDirectoryBacked || ui.flags.canUpdateCustomItem
            }
            canDelete={
              !ui.flags.isDirectoryBacked || ui.flags.canRemoveCustomItem
            }
            onBack={ui.closeInnerView}
            onDone={ui.closeInnerView}
            onAdd={ui.openAddCustomItem}
            onEdit={ui.openCustomItemEditor}
            onDelete={ui.removeCustomItem}
          />
        ) : (
          <>
            <div className="preparaty__mini-panel-body" ref={listScrollRef}>
              <MiniCartNavTabs
                value={ui.miniNav}
                onChange={(nav) => {
                  ui.setMiniNav(nav);
                  if (nav !== "clinical-recs") ui.setMkbSearchOpen(false);
                }}
              />

              {ui.miniNav === "clinical-recs" ? (
                <div
                  className={`preparaty__mini-recs${
                    isMkbResultsMode ? " is-mkb-results" : ""
                  }`}
                >
                  {showMkbSearch ? (
                    <MiniCartMkbSearch
                      query={mkbSearch.query}
                      open={ui.mkbSearchOpen || isMkbResultsMode}
                      visit={mkbSearch.visitType}
                      age={mkbSearch.ageGroup}
                      disabledVisitIds={mkbSearch.disabledVisitIds}
                      disabledAgeIds={mkbSearch.disabledAgeIds}
                      onQueryChange={(value) => {
                        mkbSearch.setQuery(value);
                        ui.setMkbQuery(value);
                      }}
                      onOpenChange={ui.setMkbSearchOpen}
                      onVisitChange={(visit) => {
                        mkbSearch.setVisitType(visit);
                        ui.setMkbVisit(visit);
                      }}
                      onAgeChange={(age) => {
                        mkbSearch.setAgeGroup(age);
                        ui.setMkbAge(age);
                      }}
                      onSearch={() => {
                        mkbSearch.submitSearch();
                      }}
                    />
                  ) : null}

                  {isMkbResultsMode || showMkbSuggestions ? (
                    <MiniCartMkbSearchResults
                      search={mkbSearch}
                      showSuggestions={showMkbSuggestions}
                      showCancel={isMkbResultsMode}
                      loadingKey={mkbLoadingKey}
                      selectError={mkbSelectError}
                      onSelectCard={(card) => {
                        void handleMkbCardSelect(card);
                      }}
                      onCancel={handleMkbCancelSearch}
                    />
                  ) : null}

                  {!isMkbResultsMode ? (
                    <>
                      <MiniCartSectionTabs
                        tabs={ui.tabs}
                        activeTab={ui.activeTab}
                        page={ui.miniTabPage}
                        onTabChange={(tabId) => {
                          ui.setActiveTab(tabId);
                          const index = ui.tabs.findIndex(
                            (tab) => tab.id === tabId,
                          );
                          ui.setMiniTabPage(index >= 4 ? 1 : 0);
                        }}
                        onPageChange={ui.setMiniTabPage}
                      />
                      <MiniCartItemList
                        activeTab={ui.activeTab}
                        shellTabs={shellTabs}
                        drugItems={ui.drugItems}
                        classicItems={ui.classicItems}
                        canToggle={
                          !ui.flags.isDirectoryBacked || ui.flags.canToggle
                        }
                        canComment={
                          !ui.flags.isDirectoryBacked || ui.flags.canComment
                        }
                        canOpenTrade={ui.canOpenTradePicker}
                        canOpenScheme={ui.canOpenSchemePicker}
                        canOpenCombo={ui.canOpenComboPicker}
                        canSelectAll={
                          !ui.flags.isDirectoryBacked ||
                          ui.flags.canSelectAllRequired
                        }
                        onToggle={ui.toggleItem}
                        onOpenComment={(itemId) =>
                          ui.openComment(itemId, captureListScroll())
                        }
                        onOpenInfo={(itemId) =>
                          ui.openInfoForItem(itemId, captureListScroll())
                        }
                        onOpenTrade={(itemId, anchor) => {
                          const item = ui.findItem(itemId);
                          if (!item || !ui.canOpenTradePicker(item)) return;
                          ui.setTradeTargetId(itemId);
                          setTradeAnchor(anchor);
                        }}
                        onOpenScheme={(itemId) => {
                          const item = ui.findItem(itemId);
                          if (!item || !ui.canOpenSchemePicker(item)) return;
                          if (
                            ui.flags.isDirectoryBacked &&
                            !(schemeByItemId[itemId]?.components?.length > 0)
                          ) {
                            return;
                          }
                          ui.setSchemeTargetId(itemId);
                        }}
                        onOpenCombo={(itemId) => {
                          const item = ui.findItem(itemId);
                          if (!item || !ui.canOpenComboPicker(item)) return;
                          ui.setComboTargetId(itemId);
                        }}
                        onSelectAll={ui.selectAllRequired}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {ui.miniNav === "easymed-ai" ? (
                <MiniCartAiPanel
                  input={ui.aiInput}
                  onInputChange={ui.setAiInput}
                />
              ) : null}

              {ui.miniNav === "interactions" ? (
                <MiniCartInteractionsPanel
                  selectedDrugs={selectedDrugs}
                  query={ui.ixQuery}
                  onQueryChange={ui.setIxQuery}
                />
              ) : null}
            </div>

            {!isMkbResultsMode ? (
              <MiniCartFooter
                recommendation={ui.recommendation}
                onRecommendationChange={ui.setRecommendation}
                onAddClick={ui.openAddCustomItem}
                onOpenCustomItems={() =>
                  ui.openCustomItemsScreen(captureListScroll())
                }
                customItemsCount={ui.customItems.length}
                canAdd={
                  !ui.flags.isDirectoryBacked || ui.flags.canAddCustomItem
                }
                canEditRecommendation={
                  !ui.flags.isDirectoryBacked || ui.flags.canSetRecommendation
                }
                onWrite={openChartPrompt}
                onCopy={
                  assignmentOps?.copySelected ? handleCopySelected : undefined
                }
              />
            ) : null}
          </>
        )}
        {copyNotice ? (
          <div
            className={`preparaty__mini-copy-notice${
              copyNotice.error ? " is-error" : ""
            }${copyNotice.hiding ? " is-hiding" : ""}`}
            role="status"
            aria-live="polite"
          >
            {copyNotice.text}
          </div>
        ) : null}
      </aside>
    ) : null;

    const portalContextValue = useMemo(() => {
      const openerFallback = isLivePortalTarget(fallbackRoot)
        ? fallbackRoot
        : null;
      return {
        ownerDocument:
          ownerDocument ||
          (typeof document !== "undefined"
            ? document
            : (null as unknown as Document)),
        portalRoot: (isPip && livePipTarget
          ? livePipTarget
          : openerFallback) as HTMLElement | null,
        isPip,
      };
    }, [fallbackRoot, isPip, livePipTarget, ownerDocument]);

    return (
      <div
        ref={hostRef}
        className={`emMiniCart${className ? ` ${className}` : ""}`}
        data-mini-cart-mode={mode}
        data-mini-cart-pip={isPip ? "1" : "0"}
        data-mini-cart-pip-micro={showPipMicro ? "1" : "0"}
        data-mini-cart-pip-supported={pip.supported ? "1" : "0"}
      >
        <MiniCartPortalProvider value={portalContextValue}>
          <div
            className={`preparaty${mode === "docked" ? " is-docked" : ""}${
              mode !== "full" ? " is-collapsed" : ""
            }`}
          >
            {mode !== "full" ? (
              <>
                {isPip && livePipTarget && panel
                  ? createPortal(panel, livePipTarget)
                  : panel}

                {showPipMicro && livePipTarget
                  ? createPortal(
                      <button
                        type="button"
                        className="preparaty__pip-micro"
                        aria-label="Открыть миникорзинку EasyMed"
                        onClick={handleRestoreDock}
                      >
                        <span className="preparaty__pip-micro-mark">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/mini-cart/logo-white.png"
                            width={101}
                            height={43}
                            alt=""
                          />
                        </span>
                      </button>,
                      livePipTarget,
                    )
                  : null}

                <MiniCartDock
                  hidden={!showDock || showPipMicro}
                  onRestore={handleRestoreDock}
                />

                {noteItem ? (
                  <MiniCartNoteModal
                    title={noteItem.name}
                    subtitle="Комментарий к назначению"
                    value={ui.noteDraft}
                    onChange={ui.setNoteDraft}
                    readOnly={
                      ui.flags.isDirectoryBacked && !ui.flags.canComment
                    }
                    onClose={() => ui.setNoteTargetId(null)}
                    onSave={() => {
                      ui.updateComment(noteItem.id, ui.noteDraft);
                      ui.setNoteTargetId(null);
                    }}
                  />
                ) : null}

                {infoItem ? (
                  <MiniCartInfoModal
                    item={infoItem}
                    editable={ui.canEditItemFields(infoItem)}
                    canComment={
                      !ui.flags.isDirectoryBacked || ui.flags.canComment
                    }
                    initialFocus={ui.detailsInitialFocus}
                    onChangeField={(field, value) =>
                      ui.setMedicationField(infoItem.id, field, value)
                    }
                    onCommentChange={(value) =>
                      ui.updateComment(infoItem.id, value)
                    }
                    onClose={ui.closeInfoModal}
                  />
                ) : null}

                {tradeItem ? (
                  <MiniCartTradePopover
                    item={tradeItem}
                    trades={trades}
                    anchorEl={tradeAnchor}
                    onClose={() => {
                      ui.setTradeTargetId(null);
                      setTradeAnchor(null);
                    }}
                    onPick={(pick) => {
                      ui.applyTrade(tradeItem.id, pick);
                      ui.setTradeTargetId(null);
                      setTradeAnchor(null);
                    }}
                  />
                ) : null}

                {schemeItem && schemeItem.kind === "scheme" ? (
                  <MiniCartSchemeModal
                    key={schemeItem.id}
                    item={schemeItem}
                    trades={trades}
                    combinationComponents={
                      schemeByItemId[schemeItem.id]?.components
                    }
                    confirmedDraft={
                      schemeByItemId[schemeItem.id]?.confirmed ?? null
                    }
                    onClose={() => ui.setSchemeTargetId(null)}
                    onDone={(picks) => {
                      ui.applySchemePicks(schemeItem.id, picks);
                      ui.setSchemeTargetId(null);
                    }}
                    onConfirmCombination={(draft) => {
                      ui.applyCombination(schemeItem.id, draft);
                      ui.setSchemeTargetId(null);
                    }}
                  />
                ) : null}

                {comboItem && comboItem.kind === "combo" ? (
                  <MiniCartComboModal
                    item={comboItem}
                    trades={trades}
                    onClose={() => ui.setComboTargetId(null)}
                    onDone={(pick) => {
                      ui.applyComboPick(comboItem.id, pick);
                      ui.setComboTargetId(null);
                    }}
                  />
                ) : null}

                {ui.addModalOpen ? (
                  <MiniCartAddModal
                    key={ui.editingCustomItemId ?? "add"}
                    mode={ui.editingCustomItemId ? "edit" : "add"}
                    initialItem={
                      ui.editingCustomItemId
                        ? ui.findCustomItem(ui.editingCustomItemId)
                        : null
                    }
                    onClose={ui.closeCustomItemModal}
                    onSubmit={ui.saveCustomItem}
                  />
                ) : null}

                {chartStep !== "closed" ? (
                  <MiniCartChartFlow
                    step={chartStep}
                    box={chartBox}
                    onClose={closeChartFlow}
                    onContact={openChartContact}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </MiniCartPortalProvider>
      </div>
    );
  },
);

export default MiniCartShell;

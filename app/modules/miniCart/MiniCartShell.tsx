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
import MiniCartAiPanel from "./components/MiniCartAiPanel";
import MiniCartComboModal from "./components/MiniCartComboModal";
import MiniCartDock from "./components/MiniCartDock";
import MiniCartDrugDetailsScreen from "./components/MiniCartDrugDetailsScreen";
import MiniCartFooter from "./components/MiniCartFooter";
import MiniCartHeader from "./components/MiniCartHeader";
import MiniCartInfoModal from "./components/MiniCartInfoModal";
import MiniCartInteractionsPanel from "./components/MiniCartInteractionsPanel";
import MiniCartItemList from "./components/MiniCartItemList";
import MiniCartMkbSearch from "./components/MiniCartMkbSearch";
import MiniCartNavTabs from "./components/MiniCartNav";
import MiniCartNoteModal from "./components/MiniCartNoteModal";
import MiniCartSchemeModal from "./components/MiniCartSchemeModal";
import MiniCartSectionTabs from "./components/MiniCartSectionTabs";
import MiniCartTradePopover from "./components/MiniCartTradePopover";
import { MiniCartPortalProvider } from "./context/MiniCartPortalContext";
import { useDocumentPip } from "./hooks/useDocumentPip";
import { useMiniCartUiState } from "./hooks/useMiniCartUiState";
import { isLivePortalTarget } from "./pip/documentPip";
import type {
  MiniCartCatalogItem,
  MiniCartDisplayMode,
  MiniCartProps,
} from "./types";
import "./styles/miniCartScope.css";
import "./styles/miniCartDrugDetails.css";

function flattenClassicItems(
  shellTabs: MiniCartProps["shellTabs"],
): MiniCartCatalogItem[] {
  const list: MiniCartCatalogItem[] = [];
  Object.entries(shellTabs).forEach(([tabId, shell]) => {
    (shell.groups ?? []).forEach((group) => {
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
          selected: Boolean(row.selected),
          tabId,
          group: group.id || group.title || "",
        });
      });
    });
  });
  return list;
}

export type MiniCartShellHandle = {
  /** Вызывать только из user-gesture (click). */
  requestCompactFromGesture: () => Promise<boolean>;
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
      assignmentOps,
      schemeByItemId = {},
      hideMkbSearch = false,
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
      assignmentOps,
    });

    const hostRef = useRef<HTMLDivElement>(null);
    const panelMeasureRef = useRef<HTMLElement | null>(null);
    const listScrollRef = useRef<HTMLDivElement | null>(null);
    const closeOverlaysRef = useRef<() => void>(() => undefined);
    const [tradeAnchor, setTradeAnchor] = useState<HTMLElement | null>(null);
    const [fallbackRoot, setFallbackRoot] = useState<HTMLElement | null>(null);

    const wantPip = mode === "compact";

    const {
      setNoteTargetId,
      setInfoTargetId,
      setTradeTargetId,
      setSchemeTargetId,
      setComboTargetId,
      setAddModalOpen,
      closeDrugDetails,
    } = ui;

    const closeOverlays = useCallback(() => {
      setNoteTargetId(null);
      setInfoTargetId(null);
      setTradeTargetId(null);
      setSchemeTargetId(null);
      setComboTargetId(null);
      setAddModalOpen(false);
      setTradeAnchor(null);
      closeDrugDetails();
    }, [
      closeDrugDetails,
      setAddModalOpen,
      setComboTargetId,
      setInfoTargetId,
      setNoteTargetId,
      setSchemeTargetId,
      setTradeTargetId,
    ]);
    closeOverlaysRef.current = closeOverlays;

    const pip = useDocumentPip({
      wantPip,
      measureEl: panelMeasureRef.current,
      onPipClosedByBrowser: () => {
        // Системный крестик PiP: сбросить модалки/экраны до fallback-рендера.
        closeOverlaysRef.current();
        setMode("compact");
      },
    });

    useEffect(() => {
      setFallbackRoot(hostRef.current);
    }, []);

    const livePipTarget =
      pip.active && isLivePortalTarget(pip.portalTarget)
        ? pip.portalTarget
        : null;
    const isPip = Boolean(livePipTarget);
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
      closeDrugDetails();
    }, [
      closeDrugDetails,
      ui.findItem,
      ui.setMedicationInfoComment,
      ui.view,
    ]);

    useEffect(() => {
      if (ui.view.type !== "drug-details") return;
      if (!ui.findItem(ui.view.itemId)) {
        closeDrugDetails();
      }
    }, [closeDrugDetails, ui.findItem, ui.view]);

    const enterCompactFromGesture = useCallback(async () => {
      setMode("compact");
      if (!pip.supported) return false;
      return pip.openFromUserGesture();
    }, [pip, setMode]);

    useImperativeHandle(
      ref,
      () => ({
        requestCompactFromGesture: enterCompactFromGesture,
      }),
      [enterCompactFromGesture],
    );

    const handleMinimize = useCallback(() => {
      closeOverlays();
      pip.close();
      setMode("docked");
    }, [closeOverlays, pip, setMode]);

    const handleExpand = useCallback(() => {
      closeOverlays();
      pip.close();
      setMode("full");
    }, [closeOverlays, pip, setMode]);

    const handleClose = useCallback(() => {
      closeOverlays();
      pip.close();
      setMode("full");
    }, [closeOverlays, pip, setMode]);

    const handleRestoreDock = useCallback(async () => {
      setMode("compact");
      if (pip.supported) {
        await pip.openFromUserGesture();
      }
    }, [pip, setMode]);

    const showCompactPanel = mode === "compact";
    const showDock = mode === "docked";

    const noteItem = ui.noteTargetId ? ui.findItem(ui.noteTargetId) : null;
    const infoItem = ui.infoTargetId ? ui.findItem(ui.infoTargetId) : null;
    const drugDetailsItem =
      ui.view.type === "drug-details" ? ui.findItem(ui.view.itemId) : null;
    const tradeItem = ui.tradeTargetId ? ui.findItem(ui.tradeTargetId) : null;
    const schemeItem = ui.schemeTargetId ? ui.findItem(ui.schemeTargetId) : null;
    const comboItem = ui.comboTargetId ? ui.findItem(ui.comboTargetId) : null;
    const selectedDrugs = ui.drugItems.filter((item) => item.selected);
    const showDrugDetails = Boolean(drugDetailsItem);

    const wasDrugDetailsRef = useRef(false);
    useLayoutEffect(() => {
      if (showDrugDetails) {
        wasDrugDetailsRef.current = true;
        return;
      }
      if (!wasDrugDetailsRef.current || !listScrollRef.current) return;
      wasDrugDetailsRef.current = false;
      const list = listScrollRef.current.querySelector(
        ".preparaty__mini-panel-list",
      );
      if (list instanceof HTMLElement) {
        list.scrollTop = ui.listScrollTop;
      }
    }, [showDrugDetails, ui.listScrollTop]);

    const panel = showCompactPanel ? (
      <aside
        ref={(node) => {
          panelMeasureRef.current = node;
        }}
        className={`preparaty__mini-panel${isPip ? " is-pip" : ""}${
          showDrugDetails ? " is-drug-details" : ""
        }`}
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
            onBack={leaveDrugDetails}
            onDone={leaveDrugDetails}
            onToggleInclude={() => ui.toggleItem(drugDetailsItem.id)}
            onChangeField={(field, value) =>
              ui.setMedicationField(drugDetailsItem.id, field, value)
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
                <div className="preparaty__mini-recs">
                  {hideMkbSearch ? null : (
                    <MiniCartMkbSearch
                      query={ui.mkbQuery}
                      open={ui.mkbSearchOpen}
                      visit={ui.mkbVisit}
                      age={ui.mkbAge}
                      onQueryChange={ui.setMkbQuery}
                      onOpenChange={ui.setMkbSearchOpen}
                      onVisitChange={ui.setMkbVisit}
                      onAgeChange={ui.setMkbAge}
                      onSearch={() => undefined}
                    />
                  )}
                  <MiniCartSectionTabs
                    tabs={ui.tabs}
                    activeTab={ui.activeTab}
                    page={ui.miniTabPage}
                    onTabChange={(tabId) => {
                      ui.setActiveTab(tabId);
                      const index = ui.tabs.findIndex((tab) => tab.id === tabId);
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
                    onOpenComment={ui.openComment}
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

            <MiniCartFooter
              recommendation={ui.recommendation}
              onRecommendationChange={(value) => {
                if (ui.flags.isDirectoryBacked) return;
                ui.setRecommendation(value);
              }}
              onAddClick={() => {
                if (ui.flags.isDirectoryBacked) return;
                ui.setAddModalOpen(true);
              }}
              assignmentsReadOnly={ui.flags.isDirectoryBacked}
            />
          </>
        )}
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

                <MiniCartDock
                  hidden={!showDock}
                  onRestore={() => void handleRestoreDock()}
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
                    onChangeField={(field, value) =>
                      ui.setMedicationField(infoItem.id, field, value)
                    }
                    onClose={() => ui.setInfoTargetId(null)}
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
                    onClose={() => ui.setAddModalOpen(false)}
                    onSave={(name) => {
                      ui.addCustomItem(name);
                      ui.setAddModalOpen(false);
                    }}
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

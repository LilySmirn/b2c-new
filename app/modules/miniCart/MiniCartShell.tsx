"use client";

import { useMemo } from "react";
import MiniCartAddModal from "./components/MiniCartAddModal";
import MiniCartAiPanel from "./components/MiniCartAiPanel";
import MiniCartComboModal from "./components/MiniCartComboModal";
import MiniCartDock from "./components/MiniCartDock";
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
import { useMiniCartUiState } from "./hooks/useMiniCartUiState";
import type { MiniCartCatalogItem, MiniCartProps } from "./types";
import "./styles/miniCartScope.css";

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
          selected: false,
          tabId,
          group: group.title || "",
        });
      });
    });
  });
  return list;
}

export default function MiniCartShell({
  diagnosis,
  tabs: initialTabs,
  drugItems: initialDrugItems,
  shellTabs,
  trades = {},
  className,
  initiallyOpen = true,
}: MiniCartProps) {
  const classicSeed = useMemo(
    () => flattenClassicItems(shellTabs),
    [shellTabs],
  );

  const ui = useMiniCartUiState({
    initialTabs,
    initialDrugItems,
    initialClassicItems: classicSeed,
    shellTabs,
    initiallyOpen,
  });

  const noteItem = ui.noteTargetId ? ui.findItem(ui.noteTargetId) : null;
  const infoItem = ui.infoTargetId ? ui.findItem(ui.infoTargetId) : null;
  const tradeItem = ui.tradeTargetId ? ui.findItem(ui.tradeTargetId) : null;
  const schemeItem = ui.schemeTargetId ? ui.findItem(ui.schemeTargetId) : null;
  const comboItem = ui.comboTargetId ? ui.findItem(ui.comboTargetId) : null;
  const selectedDrugs = ui.drugItems.filter((item) => item.selected);

  return (
    <div className={`emMiniCart${className ? ` ${className}` : ""}`}>
      <div className={`preparaty${ui.docked ? " is-docked" : ""}`}>
        {ui.open && !ui.docked ? (
          <aside className="preparaty__mini-panel" aria-label="Миникорзинка">
            <MiniCartHeader
              diagnosis={diagnosis}
              onMinimize={() => ui.setDocked(true)}
              onExpand={() => {
                /* Expand to full cart — на следующем этапе */
              }}
              onClose={() => {
                ui.setOpen(false);
                ui.setDocked(false);
              }}
            />

            <div className="preparaty__mini-panel-body">
              <MiniCartNavTabs
                value={ui.miniNav}
                onChange={(nav) => {
                  ui.setMiniNav(nav);
                  if (nav !== "clinical-recs") ui.setMkbSearchOpen(false);
                }}
              />

              {ui.miniNav === "clinical-recs" ? (
                <div className="preparaty__mini-recs">
                  <MiniCartMkbSearch
                    query={ui.mkbQuery}
                    open={ui.mkbSearchOpen}
                    visit={ui.mkbVisit}
                    age={ui.mkbAge}
                    onQueryChange={ui.setMkbQuery}
                    onOpenChange={ui.setMkbSearchOpen}
                    onVisitChange={ui.setMkbVisit}
                    onAgeChange={ui.setMkbAge}
                    onSearch={() => {
                      /* Preview: поиск МКБ без реального API */
                    }}
                  />
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
                    onToggle={ui.toggleItem}
                    onOpenComment={ui.openComment}
                    onOpenInfo={ui.setInfoTargetId}
                    onOpenTrade={ui.setTradeTargetId}
                    onOpenScheme={ui.setSchemeTargetId}
                    onOpenCombo={ui.setComboTargetId}
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
              onRecommendationChange={ui.setRecommendation}
              onAddClick={() => ui.setAddModalOpen(true)}
            />
          </aside>
        ) : null}

        <MiniCartDock
          hidden={!ui.docked}
          onRestore={() => ui.setDocked(false)}
        />

        {noteItem ? (
          <MiniCartNoteModal
            title={noteItem.name}
            subtitle="Комментарий к назначению"
            value={ui.noteDraft}
            onChange={ui.setNoteDraft}
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
            onClose={() => ui.setInfoTargetId(null)}
          />
        ) : null}

        {tradeItem ? (
          <MiniCartTradePopover
            item={tradeItem}
            trades={trades}
            onClose={() => ui.setTradeTargetId(null)}
            onPick={(pick) => {
              ui.applyTrade(tradeItem.id, pick);
              ui.setTradeTargetId(null);
            }}
          />
        ) : null}

        {schemeItem && schemeItem.kind === "scheme" ? (
          <MiniCartSchemeModal
            item={schemeItem}
            trades={trades}
            onClose={() => ui.setSchemeTargetId(null)}
            onDone={(picks) => {
              ui.applySchemePicks(schemeItem.id, picks);
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
      </div>
    </div>
  );
}

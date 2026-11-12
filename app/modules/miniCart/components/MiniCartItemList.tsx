import type { MouseEvent } from "react";
import { schemeBadgeText } from "@/app/(directory)/components/medications/combinationSelection";
import { displayName, displaySub, isSelectableDrug } from "../lib/display";
import type { MiniCartCatalogItem, MiniCartShellTab } from "../types";

type MiniCartItemListProps = {
  activeTab: string;
  shellTabs: Record<string, MiniCartShellTab>;
  drugItems: MiniCartCatalogItem[];
  classicItems: MiniCartCatalogItem[];
  assignmentsReadOnly?: boolean;
  onToggle: (itemId: string) => void;
  onOpenComment: (itemId: string) => void;
  onOpenInfo: (itemId: string) => void;
  onOpenTrade: (itemId: string, anchor: HTMLElement | null) => void;
  onOpenScheme: (itemId: string) => void;
  onOpenCombo: (itemId: string) => void;
  onSelectAll: (tabId: string) => void;
};

function MarkButton({
  kind,
  text,
  onClick,
}: {
  kind: "qc" | "level";
  text?: string;
  onClick?: () => void;
}) {
  const slotClass = kind === "qc" ? "preparaty__qc" : "preparaty__level";
  if (!text) return <span className={slotClass} aria-hidden="true" />;
  return (
    <button
      type="button"
      className={slotClass}
      aria-label={kind === "qc" ? "Критерий качества" : "Уровень достоверности"}
      onClick={onClick}
    >
      {text}
    </button>
  );
}

function DrugRow({
  item,
  assignmentsReadOnly = false,
  onToggle,
  onOpenComment,
  onOpenInfo,
  onOpenTrade,
  onOpenScheme,
  onOpenCombo,
}: {
  item: MiniCartCatalogItem;
  assignmentsReadOnly?: boolean;
  onToggle: (itemId: string) => void;
  onOpenComment: (itemId: string) => void;
  onOpenInfo: (itemId: string) => void;
  onOpenTrade: (itemId: string, anchor: HTMLElement | null) => void;
  onOpenScheme: (itemId: string) => void;
  onOpenCombo: (itemId: string) => void;
}) {
  const selectable = !assignmentsReadOnly && isSelectableDrug(item);
  const sub = assignmentsReadOnly
    ? item.selectedTrade && item.selectedInn
      ? item.selectedInn
      : ""
    : displaySub(item);
  const name = displayName(item);

  const openPicker = (event: MouseEvent<HTMLButtonElement>) => {
    if (item.kind === "scheme") {
      onOpenScheme(item.id);
      return;
    }
    if (item.kind === "combo") {
      onOpenCombo(item.id);
      return;
    }
    onOpenTrade(item.id, event.currentTarget);
  };

  const nameNode = selectable ? (
    <button
      type="button"
      className="preparaty__name is-selectable"
      onClick={openPicker}
    >
      <span className="preparaty__name-text">
        {name}
        {item.kind === "extra-drug" ? (
          <span className="preparaty__extra-badge">сверх КР</span>
        ) : null}
        {sub ? <span className="preparaty__name-sub">{sub}</span> : null}
      </span>
    </button>
  ) : (
    <span className="preparaty__name">
      <span className="preparaty__name-text">
        {name}
        {sub ? <span className="preparaty__name-sub">{sub}</span> : null}
      </span>
    </span>
  );

  return (
    <article
      className={`preparaty__row preparaty__row--mini-drug${item.selected ? " is-selected" : ""}${
        item.kind === "combo" ? " preparaty__row--combo" : ""
      }${item.kind === "scheme" ? " preparaty__row--scheme" : ""}${
        item.kind === "extra-drug" ? " preparaty__row--extra" : ""
      }`}
    >
      <div className="preparaty__first">
        <label className="preparaty__check">
          <input
            type="checkbox"
            checked={Boolean(item.selected)}
            disabled={assignmentsReadOnly}
            aria-label={`Выбрать ${item.name || name}`}
            onChange={() => onToggle(item.id)}
          />
          <span />
        </label>
        <MarkButton kind="qc" text={item.qc} onClick={() => onOpenInfo(item.id)} />
        <MarkButton kind="level" text={item.level} onClick={() => onOpenInfo(item.id)} />
      </div>
      {item.kind === "scheme" ? (
        <div className="preparaty__scheme">
          <span className="preparaty__mark preparaty__mark--scheme">
            {schemeBadgeText(
              item.components?.length || item.composition?.length || 0,
            )}
          </span>
          {nameNode}
        </div>
      ) : item.kind === "combo" ? (
        <div className="preparaty__combo">
          <span className="preparaty__mark preparaty__mark--combo">
            {`Комбинация · ${item.composition?.length || item.alternatives?.length || 0} ДВ`}
          </span>
          {nameNode}
        </div>
      ) : (
        nameNode
      )}
      <div className="preparaty__classic-info">
        <button
          type="button"
          className="preparaty__info"
          aria-label="Информация о назначении"
          onClick={() => onOpenInfo(item.id)}
        >
          i
        </button>
      </div>
      <button
        type="button"
        className={`preparaty__classic-comment${item.commentShort ? " is-filled" : ""}`}
        onClick={() => onOpenComment(item.id)}
      >
        {item.commentShort || "Комментарий..."}
      </button>
    </article>
  );
}

function ClassicRow({
  item,
  assignmentsReadOnly = false,
  onToggle,
  onOpenComment,
  onOpenInfo,
}: {
  item: MiniCartCatalogItem;
  assignmentsReadOnly?: boolean;
  onToggle: (itemId: string) => void;
  onOpenComment: (itemId: string) => void;
  onOpenInfo: (itemId: string) => void;
}) {
  return (
    <article
      className={`preparaty__row preparaty__row--classic${item.selected ? " is-selected" : ""}`}
    >
      <div className="preparaty__classic-first">
        <button
          type="button"
          className={`preparaty__checkbox${item.selected ? " is-checked" : ""}`}
          aria-label={`Выбрать ${item.name}`}
          aria-pressed={Boolean(item.selected)}
          disabled={assignmentsReadOnly}
          onClick={() => onToggle(item.id)}
        >
          {item.selected ? "✓" : ""}
        </button>
        <MarkButton kind="qc" text={item.qc} onClick={() => onOpenInfo(item.id)} />
        <MarkButton kind="level" text={item.level} onClick={() => onOpenInfo(item.id)} />
      </div>
      <button
        type="button"
        className="preparaty__classic-name"
        aria-pressed={Boolean(item.selected)}
        disabled={assignmentsReadOnly}
        onClick={() => onToggle(item.id)}
      >
        {item.name}
      </button>
      <div className="preparaty__classic-info">
        <button
          type="button"
          className="preparaty__info"
          aria-label={`Информация о назначении ${item.name}`}
          onClick={() => onOpenInfo(item.id)}
        >
          i
        </button>
      </div>
      <button
        type="button"
        className={`preparaty__classic-comment${item.commentText ? " is-filled" : ""}`}
        onClick={() => onOpenComment(item.id)}
      >
        {item.commentText || "Комментарий..."}
      </button>
    </article>
  );
}

export default function MiniCartItemList({
  activeTab,
  shellTabs,
  drugItems,
  classicItems,
  assignmentsReadOnly = false,
  onToggle,
  onOpenComment,
  onOpenInfo,
  onOpenTrade,
  onOpenScheme,
  onOpenCombo,
  onSelectAll,
}: MiniCartItemListProps) {
  if (activeTab === "drugs") {
    return (
      <div className="preparaty__mini-panel-list">
        {drugItems.map((item) => (
          <DrugRow
            key={item.id}
            item={item}
            assignmentsReadOnly={assignmentsReadOnly}
            onToggle={onToggle}
            onOpenComment={onOpenComment}
            onOpenInfo={onOpenInfo}
            onOpenTrade={onOpenTrade}
            onOpenScheme={onOpenScheme}
            onOpenCombo={onOpenCombo}
          />
        ))}
      </div>
    );
  }

  const shell = shellTabs[activeTab];
  if (!shell || shell.enabled === false) {
    return (
      <div className="preparaty__mini-panel-list">
        <p className="preparaty__empty">
          {shell?.note || "Раздел недоступен для выбранной клинической рекомендации."}
        </p>
      </div>
    );
  }

  const groups = shell.groups ?? [];
  if (!groups.length) {
    return (
      <div className="preparaty__mini-panel-list">
        <p className="preparaty__empty">Нет назначений в этом разделе.</p>
      </div>
    );
  }

  return (
    <div className="preparaty__mini-panel-list">
      {groups.map((group, groupIndex) => {
        const groupKey = group.id || group.title || "";
        const rows = classicItems.filter(
          (item) => item.tabId === activeTab && item.group === groupKey,
        );
        const showSelectAll = groupIndex === 0 && Boolean(shell.selectAllLabel);

        return (
          <section key={`${activeTab}-${groupKey || groupIndex}`} className="preparaty__section">
            <div
              className={`preparaty__section-row${showSelectAll ? "" : " preparaty__section-row--no-check"}`}
            >
              {showSelectAll ? (
                <button
                  type="button"
                  className="preparaty__checkbox"
                  aria-label={shell.selectAllLabel}
                  aria-pressed="false"
                  disabled={assignmentsReadOnly}
                  onClick={() => onSelectAll(activeTab)}
                />
              ) : null}
              <span>{group.title || ""}</span>
            </div>
            {rows.map((item) => (
              <ClassicRow
                key={item.id}
                item={item}
                assignmentsReadOnly={assignmentsReadOnly}
                onToggle={onToggle}
                onOpenComment={onOpenComment}
                onOpenInfo={onOpenInfo}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

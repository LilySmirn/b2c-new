import { useEffect, useRef, useState, type MouseEvent } from "react";
import CatalogPopover, { CatalogOption } from "./CatalogPopover";
import popoverStyles from "./CatalogPopover.module.css";
import { ruNoun, schemeBadgeText } from "./combinationSelection";
import type { MedsNameMenu } from "./medsCatalogTypes";
import styles from "./medications.module.css";

type DrugNameFieldProps = {
  title: string;
  checked: boolean;
  menu: MedsNameMenu | null;
  schemeDrugCount?: number;
  schemeSummary?: string;
  schemeOpen?: boolean;
  onOpenScheme?: () => void;
  onToggle: () => void;
  onSelectInn: (inn: string) => void;
  onSelectTrade: (trade: string) => void;
};

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden="true">
      <path
        d="M1 1.5 L6 6.5 L11 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const selectionHint = (menu: MedsNameMenu) => {
  if (menu.mode === "group") {
    if (menu.selectedInn && menu.selectedTrade) {
      return `${menu.selectedInn} · ${menu.selectedTrade}`;
    }
    if (menu.selectedInn) return `${menu.selectedInn} · выберите торговое наименование`;

    return "Выберите МНН";
  }

  return menu.selectedTrade || "Выберите торговое наименование";
};

export default function DrugNameField({
  title,
  checked,
  menu,
  schemeDrugCount,
  schemeSummary = "",
  schemeOpen = false,
  onOpenScheme,
  onToggle,
  onSelectInn,
  onSelectTrade,
}: DrugNameFieldProps) {
  const isScheme = typeof schemeDrugCount === "number" && schemeDrugCount > 0;
  const schemeCount = typeof schemeDrugCount === "number" ? schemeDrugCount : 0;
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"inn" | "trade">("inn");
  const hint = menu ? selectionHint(menu) : "";
  const hintSelected = Boolean(
    menu && (menu.selectedTrade || (menu.mode === "group" && menu.selectedInn)),
  );
  const hasMenu = menu !== null;

  useEffect(() => {
    if (!hasMenu) setOpen(false);
  }, [hasMenu]);

  const toggleRow = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  const toggleMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }

    setStep(menu?.mode === "group" ? "inn" : "trade");
    setOpen(true);
  };

  const openScheme = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenScheme?.();
  };

  if (!isScheme && !menu) {
    return (
      <div className={styles.nameSlot}>
        <button
          type="button"
          className={styles.namePlain}
          aria-pressed={checked}
          aria-label={`Выбрать ${title}`}
          onClick={toggleRow}
        >
          <span className={styles.nameText}>{title}</span>
        </button>
      </div>
    );
  }

  const nameButton = (
    <button
      ref={anchorRef}
      type="button"
      className={styles.nameButton}
      aria-pressed={isScheme || menu ? undefined : checked}
      aria-haspopup={isScheme ? "dialog" : menu ? "listbox" : undefined}
      aria-expanded={isScheme ? schemeOpen : menu ? open : undefined}
      aria-label={
        isScheme ? `Настроить схему: ${title}` : menu ? `Варианты названия: ${title}` : `Выбрать ${title}`
      }
      title={
        isScheme
          ? schemeSummary
            ? `${title}. ${schemeSummary}`
            : title
          : menu
            ? `${title}. ${hint}`
            : title
      }
      onClick={isScheme ? openScheme : menu ? toggleMenu : toggleRow}
    >
      <span className={styles.nameText}>
        {title}
        {isScheme ? (
          <span className={`${styles.nameSub} ${styles.schemeSummary} ${schemeSummary ? styles.nameSubSelected : ""}`}>
            {schemeSummary ||
              `Откройте и выберите ${schemeCount} ${ruNoun(
                schemeCount,
                "препарат",
                "препарата",
                "препаратов",
              )}`}
          </span>
        ) : menu ? (
          <span className={`${styles.nameSub} ${hintSelected ? styles.nameSubSelected : ""}`}>
            {hint}
          </span>
        ) : null}
      </span>
      <Chevron />
    </button>
  );

  const menuLayer =
    !isScheme && menu && open ? (
      <CatalogPopover
        open={open}
        anchorRef={anchorRef}
        minWidth={260}
        label={step === "inn" ? "МНН" : "Торговое наименование"}
        onClose={() => setOpen(false)}
        header={
          menu.mode === "group" && step === "trade" ? (
            <div className={popoverStyles.head}>
              <button type="button" className={popoverStyles.back} onClick={() => setStep("inn")}>
                ← МНН
              </button>
              <span className={popoverStyles.headText}>{menu.selectedInn}</span>
            </div>
          ) : (
            <div className={popoverStyles.head}>
              <span className={popoverStyles.headText}>
                {menu.mode === "group" ? "Выберите МНН" : "Торговое наименование"}
              </span>
            </div>
          )
        }
      >
        {menu.mode === "group" && step === "inn"
          ? menu.inns.map((inn) => (
              <CatalogOption
                key={inn}
                selected={inn === menu.selectedInn}
                onSelect={() => {
                  onSelectInn(inn);
                  setStep("trade");
                }}
              >
                {inn}
              </CatalogOption>
            ))
          : menu.trades.map((trade) => (
              <CatalogOption
                key={trade}
                selected={trade === menu.selectedTrade}
                onSelect={() => {
                  onSelectTrade(trade);
                  setOpen(false);
                }}
              >
                {trade}
              </CatalogOption>
            ))}
      </CatalogPopover>
    ) : null;

  if (!isScheme) {
    return (
      <div className={styles.nameSlot}>
        {nameButton}
        {menuLayer}
      </div>
    );
  }

  return (
    <div className={styles.schemeBlock}>
      <span className={styles.schemeBadge}>{schemeBadgeText(schemeCount)}</span>
      {nameButton}
      {menuLayer}
    </div>
  );
}

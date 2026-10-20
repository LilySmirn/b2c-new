import { useEffect, useRef, useState, type MouseEvent } from "react";
import CatalogPopover, { CatalogOption } from "./CatalogPopover";
import popoverStyles from "./CatalogPopover.module.css";
import type { MedsNameMenu } from "./medsCatalogTypes";
import styles from "./medications.module.css";

type DrugNameFieldProps = {
  title: string;
  checked: boolean;
  menu: MedsNameMenu | null;
  schemeDrugCount?: number;
  onToggle: () => void;
  onSelectInn: (inn: string) => void;
  onSelectTrade: (trade: string) => void;
};

const drugCountWord = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "препарат";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "препарата";

  return "препаратов";
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
  onToggle,
  onSelectInn,
  onSelectTrade,
}: DrugNameFieldProps) {
  const isScheme = typeof schemeDrugCount === "number" && schemeDrugCount > 0;
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
      aria-pressed={menu ? undefined : checked}
      aria-haspopup={menu ? "listbox" : undefined}
      aria-expanded={menu ? open : undefined}
      aria-label={menu ? `Варианты названия: ${title}` : `Выбрать ${title}`}
      title={menu ? `${title}. ${hint}` : title}
      onClick={menu ? toggleMenu : toggleRow}
    >
      <span className={styles.nameText}>
        {title}
        {menu ? (
          <span className={`${styles.nameSub} ${hintSelected ? styles.nameSubSelected : ""}`}>
            {hint}
          </span>
        ) : isScheme ? (
          <span className={styles.nameSub}>
            {`Откройте и выберите ${schemeDrugCount} ${drugCountWord(schemeDrugCount)}`}
          </span>
        ) : null}
      </span>
      <Chevron />
    </button>
  );

  const menuLayer =
    menu && open ? (
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
      <span className={styles.schemeBadge}>
        {`Схема · ${schemeDrugCount} ${drugCountWord(schemeDrugCount)}`}
      </span>
      {nameButton}
      {menuLayer}
    </div>
  );
}

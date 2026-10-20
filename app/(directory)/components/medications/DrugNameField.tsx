import type { MouseEvent } from "react";
import styles from "./medications.module.css";

type DrugNameFieldProps = {
  title: string;
  checked: boolean;
  selectable: boolean;
  schemeDrugCount?: number;
  onToggle: () => void;
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

export default function DrugNameField({
  title,
  checked,
  selectable,
  schemeDrugCount,
  onToggle,
}: DrugNameFieldProps) {
  const isScheme = typeof schemeDrugCount === "number" && schemeDrugCount > 0;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggle();
  };

  if (!isScheme && !selectable) {
    return (
      <button
        type="button"
        className={styles.namePlain}
        aria-pressed={checked}
        aria-label={`Выбрать ${title}`}
        onClick={handleClick}
      >
        <span className={styles.nameText}>{title}</span>
      </button>
    );
  }

  const nameButton = (
    <button
      type="button"
      className={styles.nameButton}
      aria-pressed={checked}
      aria-label={`Выбрать ${title}`}
      onClick={handleClick}
    >
      <span className={styles.nameText}>
        {title}
        <span className={styles.nameSub}>
          {isScheme
            ? `Откройте и выберите ${schemeDrugCount} ${drugCountWord(schemeDrugCount)}`
            : "Выберите торговое наименование"}
        </span>
      </span>
      <Chevron />
    </button>
  );

  if (!isScheme) return nameButton;

  return (
    <div className={styles.schemeBlock}>
      <span className={styles.schemeBadge}>
        {`Схема · ${schemeDrugCount} ${drugCountWord(schemeDrugCount)}`}
      </span>
      {nameButton}
    </div>
  );
}

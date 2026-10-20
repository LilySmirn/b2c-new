import { useEffect, useRef, useState } from "react";
import CatalogPopover, { CatalogOption } from "./CatalogPopover";
import styles from "./medications.module.css";

type DoseFieldProps = {
  label?: string;
  value: string;
  options?: readonly string[];
  onChange: (value: string) => void;
};

export default function DoseField({ label = "Доза", value, options = [], onChange }: DoseFieldProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hasList = options.length > 0;

  useEffect(() => {
    if (!hasList) setOpen(false);
  }, [hasList]);

  return (
    <div
      ref={anchorRef}
      className={styles.combo}
      data-field={label === "Форма" ? "form" : "dose"}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="text"
        className={styles.field}
        value={value}
        placeholder={label}
        aria-label={label}
        title={value || undefined}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      {hasList ? (
        <button
          type="button"
          className={styles.comboToggle}
          aria-label={`Варианты: ${label}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          ▾
        </button>
      ) : (
        <span className={styles.comboToggle} aria-hidden="true">
          ▾
        </span>
      )}
      {hasList ? (
        <CatalogPopover
          open={open}
          anchorRef={anchorRef}
          label={label}
          onClose={() => setOpen(false)}
        >
          {options.map((option) => (
            <CatalogOption
              key={option}
              selected={option === value}
              onSelect={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </CatalogOption>
          ))}
        </CatalogPopover>
      ) : null}
    </div>
  );
}

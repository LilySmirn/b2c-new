import styles from "./medications.module.css";

type DoseFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function DoseField({ value, onChange }: DoseFieldProps) {
  return (
    <div
      className={styles.dose}
      data-field="dose"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="text"
        className={styles.field}
        value={value}
        placeholder="Доза"
        aria-label="Доза"
        title={value || undefined}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className={styles.doseToggle} aria-hidden="true">
        ▾
      </span>
    </div>
  );
}

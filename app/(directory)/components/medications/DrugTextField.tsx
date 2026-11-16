import styles from "./medications.module.css";

type DrugTextFieldProps = {
  field: "form" | "scheme" | "course";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onDoubleClick?: () => void;
};

export default function DrugTextField({
  field,
  placeholder,
  value,
  onChange,
  onDoubleClick,
}: DrugTextFieldProps) {
  return (
    <input
      type="text"
      className={styles.field}
      data-field={field}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      title={value || undefined}
      autoComplete="off"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick?.();
      }}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

import styles from "./SearchBar.module.css";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  variant?: "default" | "connected";
};

export default function SearchBar({
  value,
  onChange,
  onFocus,
  placeholder = "Название нозологии или код МКБ",
  variant = "default",
}: SearchBarProps) {
  const wrapperClassNames = [
    styles.wrapper,
    variant === "connected" ? styles.connected : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassNames}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className={styles.input}
      />
      <span className={styles.icon} aria-hidden>
        ⌕
      </span>
    </div>
  );
}
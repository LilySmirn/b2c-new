import type { FocusEvent } from "react";

import styles from "./SearchBar.module.css";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onSearch?: () => void;
  placeholder?: string;
  variant?: "default" | "connected";
};

export default function SearchBar({
  value,
  onChange,
  onFocus,
  onSearch,
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
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;

          event.preventDefault();
          onSearch?.();
        }}
        placeholder={placeholder}
        className={styles.input}
      />
      <button
        className={styles.iconButton}
        type="button"
        aria-label="Запустить поиск"
        onClick={onSearch}
      >
        <span className={styles.icon} aria-hidden>
          ⌕
        </span>
      </button>
      {value ? (
        <button
          className={styles.clearButton}
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onChange("")}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
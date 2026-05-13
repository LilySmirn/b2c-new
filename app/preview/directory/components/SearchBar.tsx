import styles from "./SearchBar.module.css";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Название нозологии или код МКБ",
}: SearchBarProps) {
  return (
    <div className={styles.wrapper}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
      <span className={styles.icon} aria-hidden>
        ⌕
      </span>
    </div>
  );
}
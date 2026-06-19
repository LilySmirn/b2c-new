import styles from "./SuggestedCodesList.module.css";

type SuggestedCodesListProps = {
  items: string[];
  onItemSelect?: (item: string) => void;
};

export default function SuggestedCodesList({ items, onItemSelect }: SuggestedCodesListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item}>
          <button
            type="button"
            className={styles.item}
            disabled={!onItemSelect}
            onClick={() => onItemSelect?.(item)}
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}
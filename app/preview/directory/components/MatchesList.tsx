import styles from "./MatchesList.module.css";

type MatchesListProps = {
  items: string[];
  listClassName?: string;
  itemClassName?: string;
  emptyText?: string;
  footerText?: string | null;
  onItemSelect?: (item: string) => void;
};

export default function MatchesList({
  items,
  listClassName,
  itemClassName,
  emptyText = "Ничего не найдено",
  footerText,
  onItemSelect,
}: MatchesListProps) {
  const listClassNames = [styles.list, listClassName].filter(Boolean).join(" ");
  const itemClassNames = [styles.item, itemClassName].filter(Boolean).join(" ");

  return (
    <ul className={listClassNames}>
      {items.length > 0 ? (
        items.map((item, index) => (
          <li key={`${item}-${index}`} className={itemClassNames}>
            <button
              className={styles.itemButton}
              type="button"
              onClick={() => onItemSelect?.(item)}
            >
              {item}
            </button>
          </li>
        ))
      ) : (
        <li className={`${itemClassNames} ${styles.emptyItem}`}>{emptyText}</li>
      )}

      {footerText ? <li className={styles.footerItem}>{footerText}</li> : null}
    </ul>
  );
}
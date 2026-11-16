import type { ReactNode } from "react";

import NoTranslate from "@/app/components/NoTranslate";
import styles from "./MatchesList.module.css";

type MatchesListProps = {
  items: string[];
  listClassName?: string;
  itemClassName?: string;
  emptyText?: ReactNode;
  footerText?: ReactNode | null;
  onItemSelect?: (item: string) => void;
};

/** Split `K26: Diagnosis` so only the MKB code is excluded from auto-translate. */
function MatchLabel({ item }: { item: string }) {
  const colon = item.indexOf(":");
  if (colon <= 0) {
    return <NoTranslate>{item}</NoTranslate>;
  }

  const code = item.slice(0, colon).trim();
  const rest = item.slice(colon);

  return (
    <>
      <NoTranslate>{code}</NoTranslate>
      {rest}
    </>
  );
}

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
              <MatchLabel item={item} />
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
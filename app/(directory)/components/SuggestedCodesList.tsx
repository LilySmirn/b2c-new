import NoTranslate from "@/app/components/NoTranslate";
import styles from "./SuggestedCodesList.module.css";

type SuggestedCodesListProps = {
  items: string[];
  onItemSelect?: (item: string) => void;
};

function CodeLabel({ item }: { item: string }) {
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
            <CodeLabel item={item} />
          </button>
        </li>
      ))}
    </ul>
  );
}
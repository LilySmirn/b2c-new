import styles from "./SuggestedCodesList.module.css";

type SuggestedCodesListProps = {
  items: string[];
};

export default function SuggestedCodesList({ items }: SuggestedCodesListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          {item}
        </li>
      ))}
    </ul>
  );
}
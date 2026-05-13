import styles from "./MatchesList.module.css";

type MatchesListProps = {
  items: string[];
};

export default function MatchesList({ items }: MatchesListProps) {
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
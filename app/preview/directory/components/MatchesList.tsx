import styles from "./MatchesList.module.css";

type MatchesListProps = {
  items: string[];
  listClassName?: string;
  itemClassName?: string;
};

export default function MatchesList({
  items,
  listClassName,
  itemClassName,
}: MatchesListProps) {
  const listClassNames = [styles.list, listClassName].filter(Boolean).join(" ");
  const itemClassNames = [styles.item, itemClassName].filter(Boolean).join(" ");

  return (
    <ul className={listClassNames}>
      {items.map((item) => (
        <li key={item} className={itemClassNames}>
          {item}
        </li>
      ))}
    </ul>
  );
}
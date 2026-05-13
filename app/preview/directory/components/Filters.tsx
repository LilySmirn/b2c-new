import styles from "./Filters.module.css";

type FilterOption = { id: string; label: string };

type FiltersProps = {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
};

function FilterGroup({ options, value, onChange }: FiltersProps) {
  return (
    <div className={styles.group}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={value === option.id ? `${styles.button} ${styles.active}` : styles.button}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Filters({
  visitOptions,
  visitValue,
  onVisitChange,
  ageOptions,
  ageValue,
  onAgeChange,
}: {
  visitOptions: FilterOption[];
  visitValue: string;
  onVisitChange: (value: string) => void;
  ageOptions: FilterOption[];
  ageValue: string;
  onAgeChange: (value: string) => void;
}) {
  return (
    <div className={styles.row}>
      <FilterGroup options={visitOptions} value={visitValue} onChange={onVisitChange} />
      <FilterGroup options={ageOptions} value={ageValue} onChange={onAgeChange} />
    </div>
  );
}
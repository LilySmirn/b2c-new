import styles from "@/app/preview/directory/components/Filters.module.css";
import Image, { StaticImageData } from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.png";
import checkupIcon from "@/assets/images/Checkup.png";
import injectionIcon from "@/assets/images/Injection.png";
import adultIcon from "@/assets/images/adult.png";
import childIcon from "@/assets/images/child.png";

type FilterOption = { id: string; label: string };

const optionIcons: Record<string, StaticImageData> = {
  primary: stethoscopeIcon,
  repeat: checkupIcon,
  inpatient: injectionIcon,
  adult: adultIcon,
  child: childIcon,
};

type FiltersProps = {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function FilterGroup({ options, value, onChange, className }: FiltersProps) {
  return (
    <div className={className ? `${styles.group} ${className}` : styles.group}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={value === option.id ? `${styles.button} ${styles.active}` : styles.button}
        >
          <span className={styles.content}>
            {optionIcons[option.id] ? (
              <Image
                src={optionIcons[option.id]}
                alt=""
                className={value === option.id ? `${styles.icon} ${styles.iconActive}` : styles.icon}
                aria-hidden="true"
              />
            ) : null}
            <span>{option.label}</span>
          </span>
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
      <FilterGroup
        options={visitOptions}
        value={visitValue}
        onChange={onVisitChange}
        className={styles.visitGroup}
      />
      <FilterGroup
        options={ageOptions}
        value={ageValue}
        onChange={onAgeChange}
        className={styles.ageGroup}
      />
    </div>
  );
}
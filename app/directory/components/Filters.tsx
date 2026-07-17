import styles from "@/app/directory/components/Filters.module.css";
import Image, { StaticImageData } from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.svg";
import injectionIcon from "@/assets/images/Injection.svg";
import hospitalIcon from "@/assets/images/hospital.svg";

type FilterOption = { id: string; label: string };

const optionIcons: Record<string, StaticImageData> = {
  primary: stethoscopeIcon,
  repeat: injectionIcon,
  inpatient: hospitalIcon,
};

const optionBadges: Record<string, string> = {
  adult: "18+",
  child: "0+",
};

type FiltersProps = {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabledIds?: string[];
};

function FilterGroup({ options, value, onChange, className, disabledIds = [] }: FiltersProps) {
  return (
    <div className={className ? `${styles.group} ${className}` : styles.group}>
      {options.map((option) => {
        const isDisabled = disabledIds.includes(option.id) && value !== option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            disabled={isDisabled}
            className={
              value === option.id ? `${styles.button} ${styles.active}` : styles.button
            }
          >
            <span className={styles.content}>
              {optionIcons[option.id] ? (
                <Image
                  src={optionIcons[option.id]}
                  alt=""
                  className={
                    value === option.id ? `${styles.icon} ${styles.iconActive}` : styles.icon
                  }
                  aria-hidden="true"
                />
              ) : null}
              {optionBadges[option.id] ? (
                <span className={styles.badge} aria-hidden="true">
                  {optionBadges[option.id]}
                </span>
              ) : null}
              <span>{option.label}</span>
            </span>
          </button>
        );
      })}
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
  disabledVisitIds = [],
  disabledAgeIds = [],
}: {
  visitOptions: FilterOption[];
  visitValue: string;
  onVisitChange: (value: string) => void;
  ageOptions: FilterOption[];
  ageValue: string;
  onAgeChange: (value: string) => void;
  disabledVisitIds?: string[];
  disabledAgeIds?: string[];
}) {
  return (
    <div className={styles.row}>
      <FilterGroup
        options={visitOptions}
        value={visitValue}
        onChange={onVisitChange}
        className={styles.visitGroup}
        disabledIds={disabledVisitIds}
      />
      <FilterGroup
        options={ageOptions}
        value={ageValue}
        onChange={onAgeChange}
        className={styles.ageGroup}
        disabledIds={disabledAgeIds}
      />
    </div>
  );
}
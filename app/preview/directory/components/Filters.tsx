import styles from "@/app/preview/directory/components/Filters.module.css";
import Image, { StaticImageData } from "next/image";
import stethoscopeIcon from "@/assets/images/Stethoscope.svg";
import injectionIcon from "@/assets/images/Injection.svg";

type FilterOption = { id: string; label: string };

const optionIcons: Record<string, StaticImageData> = {
  primary: stethoscopeIcon,
  repeat: injectionIcon,
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
};

function HospitalIcon() {
  return (
    <svg
      className={styles.hospitalIcon}
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.5 20.5V9.8L12.5 4L19.5 9.8V20.5H5.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 20.5V12.5H16.5V20.5"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M12.5 9V16" stroke="currentColor" strokeLinecap="round" />
      <path d="M9 12.5H16" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function FilterGroup({ options, value, onChange, className }: FiltersProps) {
  return (
    <div className={className ? `${styles.group} ${className}` : styles.group}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
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
            {option.id === "inpatient" ? <HospitalIcon /> : null}
            {optionBadges[option.id] ? (
              <span className={styles.badge} aria-hidden="true">
                {optionBadges[option.id]}
              </span>
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
import styles from "./RecommendationField.module.css";

type RecommendationFieldProps = {
  placeholder?: string;
  onClick?: () => void;
};

export default function RecommendationField({
  placeholder = "Напишите общую рекомендацию для пациента...",
  onClick,
}: RecommendationFieldProps) {
  return (
    <button type="button" className={styles.field} onClick={onClick}>
      <span>{placeholder}</span>
    </button>
  );
}
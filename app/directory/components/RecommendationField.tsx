import type { TextareaHTMLAttributes } from "react";
import styles from "./RecommendationField.module.css";

type RecommendationFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className"
>;

export default function RecommendationField({
  value = "",
  placeholder = "Напишите общую рекомендацию для пациента...",
  onChange,
  ...props
}: RecommendationFieldProps) {
  return (
    <textarea
      className={styles.field}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      aria-label="Общая рекомендация для пациента"
      {...props}
    />
  );
}
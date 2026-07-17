import type { ReactNode } from "react";
import styles from "./LoadingSpinner.module.css";

type LoadingSpinnerProps = {
  children: ReactNode;
  className?: string;
};

export default function LoadingSpinner({ children, className }: LoadingSpinnerProps) {
  const classNames = [styles.loading, className].filter(Boolean).join(" ");

  return (
    <span className={classNames} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
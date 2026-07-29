import { RefObject } from "react";
import styles from "./NewBookmarkPopup.module.css";

type NosologyNameFieldProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
};

export default function NosologyNameField({
  inputRef,
  value,
  onChange,
}: NosologyNameFieldProps) {
  return (
    <label className={styles.nameLabel}>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.nameInput}
        placeholder="Введите название закладки"
      />
    </label>
  );
}
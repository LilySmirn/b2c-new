import { useEffect, useId, useMemo, useState } from "react";
import styles from "./SideCart.module.css";

const CUSTOM_ITEM_NAME_MAX_LENGTH = 160;
const CUSTOM_ITEM_COMMENT_MAX_LENGTH = 500;

const capitalizeFirstLetter = (value: string) => {
  const [firstLetter = "", ...restLetters] = Array.from(value);

  return `${firstLetter.toLocaleUpperCase("ru")}${restLetters.join("")}`;
};

type CustomCartItemModalProps = {
  mode: "add" | "edit";
  initialName?: string;
  initialComment?: string;
  onClose: () => void;
  onSubmit: (values: { name: string; comment: string }) => void;
};

export default function CustomCartItemModal({
  mode,
  initialName = "",
  initialComment = "",
  onClose,
  onSubmit,
}: CustomCartItemModalProps) {
  const nameInputId = useId();
  const commentInputId = useId();
  const [name, setName] = useState(initialName);
  const [comment, setComment] = useState(initialComment);
  const [touched, setTouched] = useState(false);

  const validationError = useMemo(() => {
    const trimmedName = name.trim();

    if (!trimmedName) return "Укажите название услуги или медикамента";
    if (trimmedName.length > CUSTOM_ITEM_NAME_MAX_LENGTH) {
      return `Название не должно быть длиннее ${CUSTOM_ITEM_NAME_MAX_LENGTH} символов`;
    }

    return "";
  }, [name]);
  const visibleError = touched ? validationError : "";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    setTouched(true);

    if (validationError) return;

    onSubmit({
      name: capitalizeFirstLetter(name.trim()),
      comment: comment.trim(),
    });
  };

  const title =
    mode === "add" ? "Добавить услугу/медикамент" : "Редактировать услугу/медикамент";
  const submitText = mode === "add" ? "Добавить" : "Сохранить";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${nameInputId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id={`${nameInputId}-title`}>
            {title}
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть окно"
          >
            ×
          </button>
        </div>

        <input
          id={nameInputId}
          className={`${styles.input} ${visibleError ? styles.inputError : ""}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Введите название*"
          maxLength={CUSTOM_ITEM_NAME_MAX_LENGTH}
          aria-label="Название услуги или медикамента"
          aria-invalid={Boolean(visibleError)}
          aria-describedby={`${nameInputId}-hint`}
          autoFocus
        />
        <div className={styles.helperRow} id={`${nameInputId}-hint`}>
          <span className={visibleError ? styles.errorText : ""}>
            {visibleError || "Обязательное поле"}
          </span>
          <span>
            {name.length}/{CUSTOM_ITEM_NAME_MAX_LENGTH}
          </span>
        </div>

        <textarea
          id={commentInputId}
          className={`${styles.input} ${styles.textarea} ${styles.commentInput}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Комментарий"
          maxLength={CUSTOM_ITEM_COMMENT_MAX_LENGTH}
          aria-label="Комментарий"
        />
        <div className={styles.helperRow}>
          <span>Необязательное поле</span>
          <span>
            {comment.length}/{CUSTOM_ITEM_COMMENT_MAX_LENGTH}
          </span>
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
            onClick={handleSubmit}
            disabled={Boolean(validationError)}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
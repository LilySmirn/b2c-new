import { useEffect, useId, useMemo, useState } from "react";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import { readCartTemplates, writeCartTemplates } from "@/app/preview/directory/components/cartTemplatesStorage";
import styles from "./SaveTemplateModal.module.css";

const TEMPLATE_NAME_MAX_LENGTH = 100;
const SERVICE_SYMBOLS_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/;

type SaveTemplateModalProps = {
  selectedItems: SelectedPrescription[];
  diagnosisCode: string;
  onClose: () => void;
};

const validateTemplateName = (name: string) => {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "Укажите название шаблона";
  }

  if (trimmedName.length > TEMPLATE_NAME_MAX_LENGTH) {
    return `Название не должно быть длиннее ${TEMPLATE_NAME_MAX_LENGTH} символов`;
  }

  if (SERVICE_SYMBOLS_PATTERN.test(trimmedName)) {
    return 'Не используйте служебные символы: < > : " / \\ | ? *';
  }

  return "";
};

export default function SaveTemplateModal({
  selectedItems,
  diagnosisCode,
  onClose,
}: SaveTemplateModalProps) {
  const inputId = useId();
  const [templateName, setTemplateName] = useState("");
  const [touched, setTouched] = useState(false);
  const [author, setAuthor] = useState("Врач не указан");

  const validationError = useMemo(
    () => validateTemplateName(templateName),
    [templateName],
  );
  const visibleError = touched ? validationError : "";

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => {
        const nextAuthor = session?.user?.name || session?.user?.email;

        if (isMounted && nextAuthor) {
          setAuthor(nextAuthor);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

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

    const savedTemplate = {
      id: crypto.randomUUID(),
      name: templateName.trim(),
      author,
      createdAt: new Date().toISOString(),
      diagnosisCode,
      doctorComments: selectedItems
        .map((item) => item.comment.trim())
        .filter(Boolean),
      items: selectedItems,
    };

    writeCartTemplates([...readCartTemplates(), savedTemplate]);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id={`${inputId}-title`}>
            Сохранить как шаблон
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть окно сохранения шаблона"
          >
            ×
          </button>
        </div>

        <label className={styles.fieldLabel} htmlFor={inputId}>
          Название шаблона <span className={styles.requiredMark}>*</span>
        </label>
        <input
          id={inputId}
          className={`${styles.input} ${visibleError ? styles.inputError : ""}`}
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Например, Контроль гипертонии"
          maxLength={TEMPLATE_NAME_MAX_LENGTH}
          aria-invalid={Boolean(visibleError)}
          aria-describedby={`${inputId}-hint`}
          autoFocus
        />
        <div className={styles.helperRow} id={`${inputId}-hint`}>
          <span className={visibleError ? styles.errorText : ""}>
            {visibleError || "Обязательное поле, без служебных символов"}
          </span>
          <span>
            {templateName.length}/{TEMPLATE_NAME_MAX_LENGTH}
          </span>
        </div>

        <p className={styles.mockNotice}>
          Пока база шаблонов не подключена, тестовое сохранение выполняется в localStorage браузера.
        </p>

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
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo } from "react";
import type { CartTemplate } from "@/app/preview/directory/components/cartTemplatesStorage";
import { readCartTemplates } from "@/app/preview/directory/components/cartTemplatesStorage";
import styles from "./SaveTemplateModal.module.css";

type SelectTemplateModalProps = {
  onSelectTemplate: (template: CartTemplate) => void;
  onClose: () => void;
};

const formatTemplateDate = (date: string) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Дата создания не указана";
  }

  return parsedDate.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function SelectTemplateModal({
  onSelectTemplate,
  onClose,
}: SelectTemplateModalProps) {
  const templates = useMemo(() => readCartTemplates(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-template-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id="select-template-title">
            Выбрать шаблон
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть окно выбора шаблона"
          >
            ×
          </button>
        </div>

        {templates.length > 0 ? (
          <ul className={styles.templateList}>
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className={styles.templateCard}
                  onClick={() => onSelectTemplate(template)}
                >
                  <span className={styles.templateName}>{template.name}</span>
                  <span className={styles.templateMeta}>
                    Создан: {formatTemplateDate(template.createdAt)} · Назначений: {template.items.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyTemplates}>
            Сохраненных шаблонов пока нет. Создайте шаблон из текущей корзины назначений.
          </p>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
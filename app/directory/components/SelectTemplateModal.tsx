import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { CartTemplate } from "@/app/directory/components/cartTemplatesStorage";
import { deleteCartTemplate, readCartTemplates } from "@/app/directory/components/cartTemplatesStorage";
import styles from "./SaveTemplateModal.module.css";
import deleteIcon from "@/assets/images/delete-icon.svg";

type SelectTemplateModalProps = {
  diagnosisCode?: string;
  onSelectTemplate: (template: CartTemplate) => void;
  onClose: () => void;
};

const normalizeDiagnosisCode = (code?: string) => code?.trim().toLocaleLowerCase("ru") ?? "";

const getTemplateSortValue = (template: CartTemplate) =>
  `${template.diagnosisCode ?? ""} ${template.name}`.trim();

export default function SelectTemplateModal({
  diagnosisCode = "",
  onSelectTemplate,
  onClose,
}: SelectTemplateModalProps) {
  const [templates, setTemplates] = useState<CartTemplate[]>(() => readCartTemplates());

const currentDiagnosisCode = normalizeDiagnosisCode(diagnosisCode);

  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (template) => normalizeDiagnosisCode(template.diagnosisCode) === currentDiagnosisCode,
      ),
    [currentDiagnosisCode, templates],
  );

  const sortedTemplates = useMemo(
    () =>
      filteredTemplates.slice().sort((left, right) =>
        getTemplateSortValue(left).localeCompare(getTemplateSortValue(right), "ru", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    [filteredTemplates],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleDeleteTemplate = (templateId: string) => {
    deleteCartTemplate(templateId);
    setTemplates((prev) => prev.filter((template) => template.id !== templateId));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.selectTemplateModal}`}
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

        {sortedTemplates.length > 0 ? (
          <ul className={styles.templateList}>
            {sortedTemplates.map((template) => (
              <li key={template.id} className={styles.templateListItem}>
                <button
                  type="button"
                  className={styles.templateCard}
                  onClick={() => onSelectTemplate(template)}
                >
                  <span className={styles.templateCode}>
                    {template.diagnosisCode || "Код МКБ не указан"}
                  </span>
                  <span className={styles.templateName}>{template.name}</span>
                </button>
                <button
                  type="button"
                  className={styles.templateDeleteButton}
                  onClick={() => handleDeleteTemplate(template.id)}
                  aria-label={`Удалить шаблон ${template.name}`}
                >
                  <Image src={deleteIcon} alt="" width={18} height={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyTemplates}>
            Для текущего кода МКБ сохраненных шаблонов пока нет. Создайте шаблон из текущей корзины назначений.
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
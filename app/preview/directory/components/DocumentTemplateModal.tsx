"use client";

import { useMemo, useState } from "react";
import type {
  DocumentFormat,
  DocumentTemplate,
} from "@/app/types/DocumentGeneration";
import { documentTemplates } from "./documentTemplates";
import { useDocumentGeneration } from "./useDocumentGeneration";
import type { CustomCartItem } from "./SideCart";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import styles from "./DocumentTemplateModal.module.css";

type GenerationUiStatus =
  | "idle"
  | "init"
  | "processing"
  | "ready"
  | "error"
  | "timeout";

type DocumentTemplateModalProps = {
  selectedItems: SelectedPrescription[];
  customItems: CustomCartItem[];
  generalComment: string;
  onClose: () => void;
};

const getStatusText = ({
  status,
  stage,
  error,
}: {
  status: GenerationUiStatus;
  stage: string | null;
  error: string | null;
}) => {
  if (error) return error;
  if (stage) return stage;

  switch (status) {
    case "idle":
      return "Выберите шаблон и формат документа.";
    case "init":
      return "Отправляем запрос на формирование документа...";
    case "processing":
      return "Документ формируется. Это может занять несколько секунд.";
    case "ready":
      return "Документ готов.";
    case "error":
      return "Не удалось сформировать документ. Попробуйте еще раз.";
    case "timeout":
      return "Превышено время ожидания формирования документа.";
  }
};

const getDefaultFormat = (template: DocumentTemplate | undefined) =>
  template?.formats[0] ?? "docx";

export default function DocumentTemplateModal({
  selectedItems,
  customItems,
  generalComment,
  onClose,
}: DocumentTemplateModalProps) {
  const firstEnabledTemplate = useMemo(
    () => documentTemplates.find((template) => template.enabled),
    [],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    firstEnabledTemplate?.id ?? "",
  );
  const [selectedFormat, setSelectedFormat] = useState<DocumentFormat>(
    getDefaultFormat(firstEnabledTemplate),
  );
  const {
    status,
    stage,
    error,
    pdfUrlToOpen,
    isActionInProgress: isGenerationInProgress,
    startGeneration,
    abort,
    openReadyPdf,
  } = useDocumentGeneration();

  const selectedTemplate = useMemo(
    () => documentTemplates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId],
  );

  const handleTemplateSelect = (template: DocumentTemplate) => {
    if (!template.enabled || isGenerationInProgress) return;

    setSelectedTemplateId(template.id);
    setSelectedFormat(getDefaultFormat(template));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedTemplate.enabled || isGenerationInProgress) {
      return;
    }

    await startGeneration({
      template: selectedTemplate,
      format: selectedFormat,
      payload: {
        selectedItems,
        customItems,
        generalComment,
      },
    });
  };

  const handleClose = () => {
    abort();
    onClose();
  };

  const statusText = getStatusText({ status, stage, error });

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-template-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Закрыть выбор шаблона документа"
        >
          ×
        </button>

        <h2 id="document-template-modal-title" className={styles.modalTitle}>
          Выберите шаблон документа
        </h2>
        <p className={styles.modalDescription}>
          После подключения генерации документ будет сформирован на сервере.
        </p>

        <div className={styles.templateList}>
          {documentTemplates.map((template) => {
            const isSelected = template.id === selectedTemplateId;

            return (
              <section
                key={template.id}
                className={`${styles.templateCard} ${
                  template.enabled ? "" : styles.templateCardDisabled
                }`}
                aria-label={template.title}
              >
                <div className={styles.templateHeader}>
                  <button
                    type="button"
                    className={styles.templateTitle}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={!template.enabled || isGenerationInProgress}
                    aria-pressed={isSelected}
                  >
                    {template.title}
                  </button>
                  <span className={styles.statusBadge}>
                    {template.enabled ? (isSelected ? "Выбран" : "Доступен") : "Скоро"}
                  </span>
                </div>

                <div className={styles.templateMeta}>
                  {template.enabled
                    ? "Выберите формат для формирования документа"
                    : "Шаблон будет доступен после подключения реального генератора"}
                </div>

                <div className={styles.formatGroup} aria-label={`Форматы ${template.title}`}>
                  {template.formats.map((format) => (
                    <button
                      key={format}
                      type="button"
                      className={`${styles.formatButton} ${
                        isSelected && selectedFormat === format
                          ? styles.formatButtonActive
                          : ""
                      }`}
                      onClick={() => {
                        handleTemplateSelect(template);
                        setSelectedFormat(format);
                      }}
                      disabled={!template.enabled || isGenerationInProgress}
                      aria-pressed={isSelected && selectedFormat === format}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p
          className={`${styles.statusMessage} ${
            status === "error" || status === "timeout" ? styles.statusMessageError : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {statusText}
        </p>

        {pdfUrlToOpen ? (
          <button
            type="button"
            className={styles.openPdfButton}
            onClick={openReadyPdf}
          >
            Открыть PDF
          </button>
        ) : null}

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={handleClose}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGenerate}
            disabled={!selectedTemplate?.enabled || isGenerationInProgress}
          >
            {isGenerationInProgress ? "Формируем..." : "Сформировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
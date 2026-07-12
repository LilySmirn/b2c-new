"use client";

import { useMemo, useState } from "react";
import type {
  DocumentFormat,
  DocumentGenerationPayload,
  DocumentTemplate,
} from "@/app/types/DocumentGeneration";
import { documentTemplates } from "./documentTemplates";
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
  onGenerate?: (params: {
    template: DocumentTemplate;
    format: DocumentFormat;
    payload: DocumentGenerationPayload;
  }) => void | Promise<void>;
};

const uiStatusText: Record<GenerationUiStatus, string> = {
  idle: "Выберите шаблон и формат документа.",
  init: "Отправляем запрос на формирование документа...",
  processing: "Документ формируется. Это может занять несколько секунд.",
  ready: "Документ готов.",
  error: "Не удалось сформировать документ. Попробуйте еще раз.",
  timeout: "Превышено время ожидания формирования документа.",
};

const isActionInProgress = (status: GenerationUiStatus) =>
  status === "init" || status === "processing";

const getDefaultFormat = (template: DocumentTemplate | undefined) =>
  template?.formats[0] ?? "docx";

export default function DocumentTemplateModal({
  selectedItems,
  customItems,
  generalComment,
  onClose,
  onGenerate,
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
  const [status, setStatus] = useState<GenerationUiStatus>("idle");

  const selectedTemplate = useMemo(
    () => documentTemplates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId],
  );

  const handleTemplateSelect = (template: DocumentTemplate) => {
    if (!template.enabled || isActionInProgress(status)) return;

    setSelectedTemplateId(template.id);
    setSelectedFormat(getDefaultFormat(template));
    setStatus("idle");
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedTemplate.enabled || isActionInProgress(status)) {
      return;
    }

    setStatus("init");

    try {
      await onGenerate?.({
        template: selectedTemplate,
        format: selectedFormat,
        payload: {
          selectedItems,
          customItems,
          generalComment,
        },
      });

      setStatus("processing");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
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
          onClick={onClose}
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
                    disabled={!template.enabled || isActionInProgress(status)}
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
                      disabled={!template.enabled || isActionInProgress(status)}
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
          {uiStatusText[status]}
        </p>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleGenerate}
            disabled={!selectedTemplate?.enabled || isActionInProgress(status)}
          >
            {isActionInProgress(status) ? "Формируем..." : "Сформировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
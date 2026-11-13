"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import chartIcon from "@/assets/images/action-panel-1.svg";
import copyIcon from "@/assets/images/action-panel-2.svg";
import documentIcon from "@/assets/images/action-panel-3.svg";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import type { CustomCartItem } from "./SideCart";
import DocumentTemplateModal from "@/app/(directory)/components/DocumentTemplateModal";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import {
  COPY_NOTICE_DURATION_MS,
  copyCartSelection,
  formatCopySuccessNotice,
} from "./cartClipboard";
import styles from "./ActionPanel.module.css";

const actions = [
  {
    id: "chart",
    label: "Запись\nв карту",
    icon: chartIcon,
  },
  {
    id: "copy",
    label: "Скопировать\nвыбранное",
    icon: copyIcon,
  },
  {
    id: "doc",
    label: "Сформировать\nдокумент",
    icon: documentIcon,
  },
];

// Keep the document action implementation available, but hide it from the panel until it is enabled.
const visibleActions = actions.filter((action) => action.id !== "doc");

type ActionPanelProps = {
  selectedItems?: SelectedPrescription[];
  customItems?: CustomCartItem[];
  generalComment?: string;
};

export default function ActionPanel({
  selectedItems = [],
  customItems = [],
  generalComment = "",
}: ActionPanelProps) {
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isContactPopupOpen, setIsContactPopupOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const copyNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isIntegrationModalOpen && !isTemplateModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsIntegrationModalOpen(false);
        setIsTemplateModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIntegrationModalOpen, isTemplateModalOpen]);

  useEffect(
    () => () => {
      if (copyNoticeTimerRef.current) {
        window.clearTimeout(copyNoticeTimerRef.current);
      }
    },
    [],
  );

  const showCopyNotice = (itemsCount: number) => {
    setCopyNotice(formatCopySuccessNotice(itemsCount));

    if (copyNoticeTimerRef.current) {
      window.clearTimeout(copyNoticeTimerRef.current);
    }

    copyNoticeTimerRef.current = window.setTimeout(() => {
      setCopyNotice("");
      copyNoticeTimerRef.current = null;
    }, COPY_NOTICE_DURATION_MS);
  };

  const copySelectedItems = async (targetDocument: Document) => {
    const result = await copyCartSelection({
      selectedItems,
      customItems,
      generalComment,
      targetDocument,
    });

    showCopyNotice(result.itemsCount);
  };

  return (
    <>
      <div className={styles.panel}>
        {visibleActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.actionButton}
            onClick={
              action.id === "chart"
                ? () => setIsIntegrationModalOpen(true)
                : action.id === "copy"
                  ? (event) => {
                      const targetDocument = event.currentTarget.ownerDocument;
                      void copySelectedItems(targetDocument);
                    }
                  : action.id === "doc"
                    ? () => setIsTemplateModalOpen(true)
                    : undefined
            }
          >
            <Image
              className={styles.icon}
              src={action.icon}
              alt=""
              width={20}
              height={20}
              aria-hidden="true"
            />
            <span className={styles.label}>
              {action.label.split("\n").map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </button>
        ))}
      </div>

      {copyNotice ? (
        <div className={styles.copyNotice} role="status" aria-live="polite">
          {copyNotice}
        </div>
      ) : null}

      {isTemplateModalOpen ? (
        <DocumentTemplateModal
          selectedItems={selectedItems}
          customItems={customItems}
          generalComment={generalComment}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      ) : null}

      {isIntegrationModalOpen ? (
        <div className={styles.modalOverlay} onClick={() => setIsIntegrationModalOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Информация об интеграции с МИС"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsIntegrationModalOpen(false)}
              aria-label="Закрыть окно интеграции с МИС"
            >
              ×
            </button>

            <p className={styles.modalText}>
              Хотите реализовать интеграцию
              <br />
              в ваш МИС?
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButton}
                onClick={() => {
                  setIsIntegrationModalOpen(false);
                  setIsContactPopupOpen(true);
                }}
              >
                Свяжитесь с нами
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isContactPopupOpen ? (
        <CorporateContactPopup onClose={() => setIsContactPopupOpen(false)} />
      ) : null}
    </>
  );
}
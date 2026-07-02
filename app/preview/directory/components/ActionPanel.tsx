"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import chartIcon from "@/assets/images/action-panel-1.svg";
import copyIcon from "@/assets/images/action-panel-2.svg";
import documentIcon from "@/assets/images/action-panel-3.svg";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import type { CustomCartItem } from "./SideCart";
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

type ActionPanelProps = {
  selectedItems?: SelectedPrescription[];
  customItems?: CustomCartItem[];
  generalComment?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getCartCategoryTitle = (item: SelectedPrescription) => {
  const title = item.categoryTitle ?? item.groupTitle;

  if (title.toLocaleLowerCase("ru").includes("диагност")) {
    return "Диагностика";
  }

  if (title === "Лечение" || title === "Препараты") {
    return "Лечение";
  }

  return title;
};

const groupSelectedItemsByCartCategory = (selectedItems: SelectedPrescription[]) =>
  selectedItems.reduce<Record<string, SelectedPrescription[]>>((acc, item) => {
    const categoryTitle = getCartCategoryTitle(item);
    acc[categoryTitle] = [...(acc[categoryTitle] ?? []), item];
    return acc;
  }, {});

const formatItemTextLines = ({
  title,
  comment,
}: {
  title: string;
  comment: string;
}) => [title, ...(comment ? [`Комментарий: ${comment}`] : [])];

const formatItemHtmlLines = ({
  title,
  comment,
}: {
  title: string;
  comment: string;
}) => [
  escapeHtml(title),
  ...(comment ? [`<em>Комментарий: ${escapeHtml(comment)}</em>`] : []),
];

const buildClipboardContent = (
  selectedItems: SelectedPrescription[],
  customItems: CustomCartItem[],
  generalComment: string,
) => {
  const groupedItems = groupSelectedItemsByCartCategory(selectedItems);
  const trimmedGeneralComment = generalComment.trim();

  const textLines = [
    ...Object.entries(groupedItems).flatMap(([categoryTitle, items]) => [
      categoryTitle,
      "",
      ...items.flatMap((item) => [
        ...formatItemTextLines({ title: item.title, comment: item.comment }),
        "",
      ]),
    ]),
    ...customItems.flatMap((item) => [
      ...formatItemTextLines({
        title: item.name,
        comment: item.comment,
      }),
      "",
    ]),
    ...(trimmedGeneralComment
      ? ["", "Общий комментарий:", trimmedGeneralComment]
      : []),
  ];
  const plainText = textLines.join("\n");

  const htmlLines = [
    ...Object.entries(groupedItems).flatMap(([categoryTitle, items]) => [
      `<strong>${escapeHtml(categoryTitle)}</strong>`,
      "",
      ...items.flatMap((item) => [
        ...formatItemHtmlLines({ title: item.title, comment: item.comment }),
        "",
      ]),
    ]),
    ...customItems.flatMap((item) => [
      ...formatItemHtmlLines({
        title: item.name,
        comment: item.comment,
      }),
      "",
    ]),
    ...(trimmedGeneralComment
      ? [
          "",
          "<strong>Общий комментарий:</strong>",
          escapeHtml(trimmedGeneralComment),
        ]
      : []),
  ];
  const html = htmlLines.join("<br>");

  return { plainText, html };
};

export default function ActionPanel({
  selectedItems = [],
  customItems = [],
  generalComment = "",
}: ActionPanelProps) {
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const copyNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isIntegrationModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsIntegrationModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIntegrationModalOpen]);

  useEffect(
    () => () => {
      if (copyNoticeTimerRef.current) {
        window.clearTimeout(copyNoticeTimerRef.current);
      }
    },
    [],
  );

  const showCopyNotice = (itemsCount: number) => {
    setCopyNotice(`Скопировано ${itemsCount} услуг`);

    if (copyNoticeTimerRef.current) {
      window.clearTimeout(copyNoticeTimerRef.current);
    }

    copyNoticeTimerRef.current = window.setTimeout(() => {
      setCopyNotice("");
      copyNoticeTimerRef.current = null;
    }, 2400);
  };

  const copySelectedItems = async () => {
    const { plainText, html } = buildClipboardContent(
      selectedItems,
      customItems,
      generalComment,
    );

    if (navigator.clipboard && "ClipboardItem" in window) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard?.writeText(plainText);
    }

    showCopyNotice(selectedItems.length + customItems.length);
  };


  return (
    <>
      <div className={styles.panel}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.actionButton}
            onClick={
              action.id === "chart"
                ? () => setIsIntegrationModalOpen(true)
                : action.id === "copy"
                  ? copySelectedItems
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
              <br />
              Свяжитесь с нами
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButton}
                onClick={() => setIsIntegrationModalOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
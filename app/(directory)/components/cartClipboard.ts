/**
 * Единственный генератор текста копирования корзины.
 * Полноразмерная корзина и мини-корзинка вызывают эти функции
 * с одним и тем же состоянием SideCart.
 */

import {
  assignmentFromDraft,
  buildPatientComment,
  clipboardTextFromPatientComment,
  formatCatalogName,
  type CombinationAssignmentView,
} from "./medications/assignmentScheme";
import type { CombinationDraft } from "./medications/combinationSelection";
import type { ChecklistAssignmentSnapshot } from "./medications/assignmentSnapshot";

export const COPY_CLIPBOARD_ERROR_MESSAGE =
  "Не удалось скопировать выбранное в буфер обмена";

export const COPY_NOTICE_DURATION_MS = 2400;

export const formatCopySuccessNotice = (itemsCount: number) =>
  `Скопировано ${itemsCount} услуг`;

export type ClipboardSelectionItem = {
  id?: string;
  categoryId?: string;
  categoryTitle?: string;
  groupTitle: string;
  sectionTitle?: string;
  title: string;
  comment: string;
  treatmentPlan?: string;
  treatmentDuration?: string;
};

export type ClipboardCustomItem = {
  id: string;
  name: string;
  comment: string;
  kind?: "service" | "drug";
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isMedicationClipboardCategory = (item: ClipboardSelectionItem) => {
  const categoryId = item.categoryId ?? "";
  const title = item.categoryTitle ?? item.groupTitle;

  return (
    categoryId === "medications" ||
    categoryId === "vaccination" ||
    title === "Препараты" ||
    title === "Лекарства"
  );
};

const getClipboardCategoryTitle = (item: ClipboardSelectionItem) => {
  const categoryId = item.categoryId ?? "";
  const title = item.categoryTitle ?? item.groupTitle;

  if (categoryId === "lifestyle") return "Общие рекомендации";

  const normalizedTitle = title.toLocaleLowerCase("ru");
  if (
    categoryId === "required-diagnostics" ||
    categoryId === "indicated-diagnostics" ||
    categoryId === "scales" ||
    normalizedTitle.includes("диагност")
  ) {
    return "Диагностические мероприятия";
  }

  if (isMedicationClipboardCategory(item)) {
    return "Лекарственная терапия";
  }

  if (categoryId === "treatment" || title === "Лечение") {
    return "Немедикаментозное лечение";
  }

  return title;
};

const combinationViewFromDraft = (
  title: string,
  draft: CombinationDraft | undefined,
): CombinationAssignmentView | null => {
  if (!draft?.picks.length) return null;

  const complete = draft.picks.every((pick) => pick.confirmed);
  if (!complete) {
    return {
      complete: false,
      primary: title.trim(),
      secondary: "",
      rows: [],
    };
  }

  const trades = draft.picks.map((pick) => {
    const trade = pick.item?.name_trade?.trim() ?? "";
    if (trade) return trade;

    const inn = pick.item?.standard_MNN?.trim() || pick.inn.trim();
    return inn ? formatCatalogName(inn) : "";
  });
  const inns = draft.picks.map((pick) => {
    const inn = pick.item?.standard_MNN?.trim() || pick.inn.trim();
    return inn ? formatCatalogName(inn) : "";
  });

  return {
    complete: true,
    primary: trades.filter(Boolean).join(" + ") || title.trim(),
    secondary: inns.filter(Boolean).join(" + "),
    rows: [],
  };
};

/**
 * Для лекарств подставляет актуальные параметры из assignment
 * (тот же смысл, что «Комментарий для пациента» в карточке препарата).
 */
export const enrichClipboardSelectionItem = (
  item: ClipboardSelectionItem,
  assignment: ChecklistAssignmentSnapshot,
): ClipboardSelectionItem => {
  if (!item.id || !isMedicationClipboardCategory(item)) return item;

  const draft = assignment.medicationDrafts[item.id];
  const intake = assignment.medicationIntake[item.id];
  const fields = assignmentFromDraft(draft, intake);
  const commentSource = assignment.commentSources?.[item.id];
  const combination = combinationViewFromDraft(
    item.title,
    assignment.combinations[item.id],
  );

  const patient = buildPatientComment({
    title: item.title,
    tradeName: draft?.trade ?? "",
    innName: draft?.inn ?? "",
    dose: fields.dose,
    form: fields.form,
    doseSource: fields.doseSource,
    formSource: fields.formSource,
    schemeText: fields.schemeText,
    courseText: fields.courseText,
    intake: fields.intake,
    originalScheme: item.treatmentPlan ?? "",
    originalCourse: item.treatmentDuration ?? "",
    note: item.comment,
    noteCustom: commentSource === "user",
    combination,
  });

  const resolved = clipboardTextFromPatientComment(patient);
  const title = resolved.title || item.title;
  const comment = resolved.comment;

  // Нет ни актуальных параметров, ни исходной схемы КР — оставляем comment как есть
  // (например, пользовательский текст без treatmentPlan в SelectedPrescription).
  if (!comment && item.comment.trim()) {
    return { ...item, title, comment: item.comment };
  }

  return { ...item, title, comment };
};

const groupSelectedItemsByClipboardCategory = (
  selectedItems: ClipboardSelectionItem[],
) =>
  selectedItems.reduce<Record<string, ClipboardSelectionItem[]>>((acc, item) => {
    const categoryTitle = getClipboardCategoryTitle(item);
    acc[categoryTitle] = [...(acc[categoryTitle] ?? []), item];
    return acc;
  }, {});

const formatItemTextLines = ({
  title,
  comment,
}: {
  title: string;
  comment: string;
}) => [comment ? `${title} - ${comment}` : title];

const formatItemHtmlLines = ({
  title,
  comment,
}: {
  title: string;
  comment: string;
}) => [
  comment
    ? `${escapeHtml(title)} - ${escapeHtml(comment)}`
    : escapeHtml(title),
];

const resolveClipboardView = (targetDocument: Document) => {
  const view = targetDocument.defaultView;
  if (!view) {
    throw new Error(COPY_CLIPBOARD_ERROR_MESSAGE);
  }
  return view;
};

const copyHtmlWithSelectionFallback = (
  html: string,
  targetDocument: Document,
) => {
  const view = resolveClipboardView(targetDocument);
  const body = targetDocument.body;
  if (!body) {
    throw new Error(COPY_CLIPBOARD_ERROR_MESSAGE);
  }

  const clipboardContainer = targetDocument.createElement("div");
  clipboardContainer.contentEditable = "true";
  clipboardContainer.innerHTML = html;
  clipboardContainer.style.position = "fixed";
  clipboardContainer.style.top = "0";
  clipboardContainer.style.left = "0";
  clipboardContainer.style.width = "1px";
  clipboardContainer.style.height = "1px";
  clipboardContainer.style.overflow = "hidden";
  clipboardContainer.style.opacity = "0";
  clipboardContainer.style.textAlign = "left";

  body.appendChild(clipboardContainer);

  const selection = view.getSelection();
  const range = targetDocument.createRange();
  range.selectNodeContents(clipboardContainer);
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    const isCopied = targetDocument.execCommand("copy");

    if (!isCopied) {
      throw new Error(COPY_CLIPBOARD_ERROR_MESSAGE);
    }
  } finally {
    selection?.removeAllRanges();
    body.removeChild(clipboardContainer);
  }
};

export const copyClipboardContent = async ({
  plainText,
  html,
  targetDocument,
}: {
  plainText: string;
  html: string;
  targetDocument: Document;
}) => {
  const view = resolveClipboardView(targetDocument);
  const ClipboardItemConstructor = view.ClipboardItem;

  if (view.navigator.clipboard?.write && ClipboardItemConstructor) {
    try {
      await view.navigator.clipboard.write([
        new ClipboardItemConstructor({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch (error) {
      console.warn("Не удалось скопировать HTML, пробуем текстовый формат", error);
    }
  }

  if (view.navigator.clipboard?.writeText) {
    try {
      await view.navigator.clipboard.writeText(plainText);
      return;
    } catch (error) {
      console.warn(
        "Не удалось скопировать через Clipboard API, используем fallback",
        error,
      );
    }
  }

  copyHtmlWithSelectionFallback(html, targetDocument);
};

export const buildClipboardContent = (
  selectedItems: ClipboardSelectionItem[],
  customItems: ClipboardCustomItem[],
  generalComment: string,
  assignment?: ChecklistAssignmentSnapshot,
) => {
  const resolvedItems = assignment
    ? selectedItems.map((item) => enrichClipboardSelectionItem(item, assignment))
    : selectedItems;
  const groupedItems = groupSelectedItemsByClipboardCategory(resolvedItems);

  if (customItems.length > 0) {
    const drugCustoms = customItems.filter((item) => item.kind === "drug");
    const serviceCustoms = customItems.filter((item) => item.kind !== "drug");

    if (drugCustoms.length > 0) {
      groupedItems["Лекарственная терапия"] = [
        ...(groupedItems["Лекарственная терапия"] ?? []),
        ...drugCustoms.map((item) => ({
          id: item.id,
          groupTitle: "Лечение",
          sectionTitle: "Лечение",
          title: item.name,
          comment: item.comment,
        })),
      ];
    }

    if (serviceCustoms.length > 0) {
      groupedItems["Дополнительно"] = [
        ...(groupedItems["Дополнительно"] ?? []),
        ...serviceCustoms.map((item) => ({
          id: item.id,
          groupTitle: "Лечение",
          sectionTitle: "Лечение",
          title: item.name,
          comment: item.comment,
        })),
      ];
    }
  }

  const trimmedGeneralComment = generalComment.trim();
  const categoryGroups = Object.entries(groupedItems);

  const textBlocks = categoryGroups.map(([categoryTitle, items]) => {
    const itemLines = items.flatMap((item) =>
      formatItemTextLines({
        title: item.title,
        comment: item.comment,
      }),
    );

    return [categoryTitle, ...itemLines].join("\n");
  });

  if (trimmedGeneralComment) {
    textBlocks.push(["Общая рекомендация:", trimmedGeneralComment].join("\n"));
  }

  const plainText = textBlocks.join("\n\n");

  const htmlBlocks = categoryGroups.map(([categoryTitle, items]) => {
    const itemLines = items.flatMap((item) =>
      formatItemHtmlLines({
        title: item.title,
        comment: item.comment,
      }),
    );

    return [
      `<strong>${escapeHtml(categoryTitle)}</strong>`,
      ...itemLines,
    ].join("<br>");
  });

  if (trimmedGeneralComment) {
    htmlBlocks.push(
      [
        "<strong>Общая рекомендация:</strong>",
        escapeHtml(trimmedGeneralComment),
      ].join("<br>"),
    );
  }

  // The application body is centered, so make the alignment part of the copied
  // fragment instead of allowing rich-text editors (and the DOM fallback) to
  // inherit it. Otherwise wrapped lines appear centered while short lines can
  // look deceptively left-aligned.
  const html = `<div style="text-align: left;">${htmlBlocks.join("<br><br>")}</div>`;

  return { plainText, html };
};

export const copyCartSelection = async ({
  selectedItems,
  customItems,
  generalComment,
  assignment,
  targetDocument,
}: {
  selectedItems: ClipboardSelectionItem[];
  customItems: ClipboardCustomItem[];
  generalComment: string;
  assignment?: ChecklistAssignmentSnapshot;
  targetDocument: Document;
}) => {
  const content = buildClipboardContent(
    selectedItems,
    customItems,
    generalComment,
    assignment,
  );

  await copyClipboardContent({
    plainText: content.plainText,
    html: content.html,
    targetDocument,
  });

  return {
    itemsCount: selectedItems.length + customItems.length,
    plainText: content.plainText,
    html: content.html,
  };
};

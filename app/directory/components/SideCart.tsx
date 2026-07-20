"use client";

import { useEffect, useState } from "react";
import ActionPanel from "./ActionPanel";
import CustomCartItemModal from "./CustomCartItemModal";
import CartTemplateToggle from "./CartTemplateToggle";
import Image from "next/image";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import RecommendationField from "./RecommendationField";
import SaveTemplateModal from "./SaveTemplateModal";
import SelectTemplateModal from "./SelectTemplateModal";
import type { CartTemplate } from "@/app/directory/components/cartTemplatesStorage";
import styles from "./SideCart.module.css";
import trashIcon from "@/assets/images/delete-icon.svg";
import deleteIcon from "@/assets/images/delete.svg";

export type CustomCartItem = {
  id: string;
  name: string;
  comment: string;
};

type SideCartProps = {
  selectedItems?: SelectedPrescription[];
  onDeleteItem?: (id: string) => void;
  onDeleteAll?: () => void;
  onApplyTemplate?: (template: CartTemplate) => void;
  diagnosisCode?: string;
  recommendationTitle?: string;
  storageKey?: string;
};

const CUSTOM_ITEMS_STORAGE_KEY = "directoryCartCustomItems";
const GENERAL_COMMENT_STORAGE_KEY = "directoryCartGeneralComments";

type StoredCustomCartItems = Record<string, CustomCartItem[]>;
type StoredGeneralComments = Record<string, string>;

const readStoredCustomItems = (): StoredCustomCartItems => {
  const storedValue =
    window.sessionStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY) ??
    window.localStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY);

  if (!storedValue) return {};

  try {
    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredCustomCartItems)
      : {};
  } catch {
    return {};
  }
};

const getStoredCustomItems = (storageKey: string) => {
  const storedItems = readStoredCustomItems()[storageKey];

  return Array.isArray(storedItems) ? storedItems : [];
};

const readStoredGeneralComments = (): StoredGeneralComments => {
  const storedValue =
    window.sessionStorage.getItem(GENERAL_COMMENT_STORAGE_KEY) ??
    window.localStorage.getItem(GENERAL_COMMENT_STORAGE_KEY);

  if (!storedValue) return {};

  try {
    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoredGeneralComments)
      : {};
  } catch {
    return {};
  }
};

const getStoredGeneralComment = (storageKey: string) => {
  const storedComment = readStoredGeneralComments()[storageKey];

  return typeof storedComment === "string" ? storedComment : "";
};

const writeStoredGeneralComment = (storageKey: string, comment: string) => {
  if (!storageKey) return;

  const storedComments = readStoredGeneralComments();
  const normalizedComment = comment.trim();

  if (normalizedComment) {
    storedComments[storageKey] = comment;
  } else {
    delete storedComments[storageKey];
  }

  const serializedComments = JSON.stringify(storedComments);

  window.sessionStorage.setItem(GENERAL_COMMENT_STORAGE_KEY, serializedComments);
  window.localStorage.setItem(GENERAL_COMMENT_STORAGE_KEY, serializedComments);
};

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

const writeStoredCustomItems = (
  storageKey: string,
  customItems: CustomCartItem[],
) => {
  if (!storageKey) return;

  const storedCustomItems = readStoredCustomItems();

  if (customItems.length > 0) {
    storedCustomItems[storageKey] = customItems;
  } else {
    delete storedCustomItems[storageKey];
  }

  const serializedCustomItems = JSON.stringify(storedCustomItems);

  window.sessionStorage.setItem(
    CUSTOM_ITEMS_STORAGE_KEY,
    serializedCustomItems,
  );
  window.localStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, serializedCustomItems);
};

export default function SideCart({
  selectedItems = [],
  onDeleteItem,
  onDeleteAll,
  onApplyTemplate,
  diagnosisCode = "",
  recommendationTitle = "",
  storageKey = "",
}: SideCartProps) {
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState<CustomCartItem[]>([]);
  const [generalComment, setGeneralComment] = useState("");
  const [loadedCustomItemsStorageKey, setLoadedCustomItemsStorageKey] = useState("");
  const [loadedGeneralCommentStorageKey, setLoadedGeneralCommentStorageKey] = useState("");
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState<CustomCartItem | null>(null);
  const [saveTemplateError, setSaveTemplateError] = useState("");
  const cartItemsCount = selectedItems.length + customItems.length;
  const hasSelectedItems = cartItemsCount > 0;
  const groupedItems = groupSelectedItemsByCartCategory(selectedItems);

  useEffect(() => {
    if (!storageKey) {
      setCustomItems([]);
      setGeneralComment("");
      setLoadedCustomItemsStorageKey("");
      setLoadedGeneralCommentStorageKey("");
      return;
    }

    setCustomItems(getStoredCustomItems(storageKey));
    setGeneralComment(getStoredGeneralComment(storageKey));
    setLoadedCustomItemsStorageKey(storageKey);
    setLoadedGeneralCommentStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || loadedCustomItemsStorageKey !== storageKey) return;

    writeStoredCustomItems(storageKey, customItems);
  }, [customItems, loadedCustomItemsStorageKey, storageKey]);

  useEffect(() => {
    if (!storageKey || loadedGeneralCommentStorageKey !== storageKey) return;

    writeStoredGeneralComment(storageKey, generalComment);
  }, [generalComment, loadedGeneralCommentStorageKey, storageKey]);

  useEffect(() => {
    if (hasSelectedItems) {
      setSaveTemplateError("");
    }
  }, [hasSelectedItems]);

  const handleSaveTemplateClick = () => {
    if (!hasSelectedItems) {
      setSaveTemplateError("Сперва добавьте назначения в корзину");
      return;
    }

    setSaveTemplateError("");
    setIsSaveTemplateModalOpen(true);
  };

  return (
    <aside className={styles.sideCart}>

      <div className={styles.headerRow}>
        <h2 className={styles.title}>Корзина назначений ({cartItemsCount})</h2>
        {hasSelectedItems ? (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Удалить всё из корзины"
            onClick={() => {
              onDeleteAll?.();
              setCustomItems([]);
              setGeneralComment("");
            }}
          >
            <Image src={trashIcon} alt="" width={18} height={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>

        <CartTemplateToggle
        onSelectTemplateClick={() => setIsSelectTemplateModalOpen(true)}
        onSaveTemplateClick={handleSaveTemplateClick}
      />
      {saveTemplateError ? (
        <p className={styles.saveTemplateError} role="alert">
          {saveTemplateError}
        </p>
      ) : null}

      <section className={styles.listPlaceholder} aria-label="Список назначений">
        {Object.entries(groupedItems).map(([groupTitle, items]) => (
          <div key={groupTitle}>
            <div className={styles.groupRow}>{groupTitle} ({items.length})</div>
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.itemRow} ${index % 2 === 1 ? styles.itemRowAlt : ""}`}
              >
                <span className={styles.itemTitle}>{item.title}</span>
                <button
                  type="button"
                  className={styles.deleteButton}
                  aria-label={`Удалить ${item.title}`}
                  onClick={() => onDeleteItem?.(item.id)}
                >
                  <Image src={deleteIcon} alt="" width={14} height={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ))}

        {customItems.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.itemRow} ${
              (selectedItems.length + index) % 2 === 1 ? styles.itemRowAlt : ""
            }`}
          >
            <span className={styles.itemTitle}>{item.name}</span>
            <span className={styles.customItemActions}>
              <button
                type="button"
                className={styles.editButton}
                aria-label={`Редактировать ${item.name}`}
                onClick={() => {
                  setEditingCustomItem(item);
                  setIsCustomItemModalOpen(true);
                }}
              >
                <span aria-hidden="true">✎</span>
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                aria-label={`Удалить ${item.name}`}
                onClick={() =>
                  setCustomItems((prev) =>
                    prev.filter((customItem) => customItem.id !== item.id),
                  )
                }
              >
                <Image src={deleteIcon} alt="" width={14} height={14} aria-hidden="true" />
              </button>
            </span>
          </div>
        ))}
      </section>

      <button
        type="button"
        className={styles.addButton}
        onClick={() => {
          setEditingCustomItem(null);
          setIsCustomItemModalOpen(true);
        }}
      >
        <span className={styles.plus}>+</span>
        <span className={styles.addText}>Добавить услугу/медикамент</span>
      </button>

      <div className={styles.recommendationWrap}>
        <RecommendationField
          value={generalComment}
          onChange={(event) => setGeneralComment(event.target.value)}
        />
      </div>

      <div className={styles.actionPanelWrap}>
        <ActionPanel
          selectedItems={selectedItems}
          customItems={customItems}
          generalComment={generalComment}
        />
      </div>

      {isCustomItemModalOpen ? (
        <CustomCartItemModal
          mode={editingCustomItem ? "edit" : "add"}
          initialName={editingCustomItem?.name}
          initialComment={editingCustomItem?.comment}
          onClose={() => setIsCustomItemModalOpen(false)}
          onSubmit={({ name, comment }) => {
            if (editingCustomItem) {
              setCustomItems((prev) =>
                prev.map((item) =>
                  item.id === editingCustomItem.id ? { ...item, name, comment } : item,
                ),
              );
            } else {
              setCustomItems((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  name,
                  comment,
                },
              ]);
            }

            setEditingCustomItem(null);
            setIsCustomItemModalOpen(false);
          }}
        />
      ) : null}

      {isSelectTemplateModalOpen ? (
        <SelectTemplateModal
          diagnosisCode={diagnosisCode}
          onSelectTemplate={(template) => {
            onApplyTemplate?.(template);
            setCustomItems(template.customItems ?? []);
            setIsSelectTemplateModalOpen(false);
          }}
          onClose={() => setIsSelectTemplateModalOpen(false)}
        />
      ) : null}

      {isSaveTemplateModalOpen ? (
        <SaveTemplateModal
          selectedItems={selectedItems}
          customItems={customItems}
          diagnosisCode={diagnosisCode}
          recommendationTitle={recommendationTitle}
          onClose={() => setIsSaveTemplateModalOpen(false)}
        />
      ) : null}
    </aside>
  );
}
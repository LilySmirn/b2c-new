"use client";

import { useEffect, useRef, useState } from "react";
import ActionPanel from "./ActionPanel";
import CustomCartItemModal from "./CustomCartItemModal";
import CartTemplateToggle from "./CartTemplateToggle";
import Image from "next/image";
import {
  getChecklistCategoryPosition,
  type SelectedPrescription,
} from "./PrescriptionChecklist";
import RecommendationField from "./RecommendationField";
import SaveTemplateModal from "./SaveTemplateModal";
import SelectTemplateModal from "./SelectTemplateModal";
import type { CartTemplate } from "@/app/(directory)/components/cartTemplatesStorage";
import { createBrowserId } from "./createBrowserId";
import {
  cartStorage,
  getCartSync,
  subscribeCartSync,
  type StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";
import styles from "./SideCart.module.css";
import trashIcon from "@/assets/images/delete-icon.svg";
import deleteIcon from "@/assets/images/delete.svg";

export type CustomCartItem = StoredCustomCartItem;

type SideCartProps = {
  selectedItems?: SelectedPrescription[];
  onDeleteItem?: (id: string) => void;
  onDeleteAll?: () => void;
  onApplyTemplate?: (template: CartTemplate) => void;
  diagnosisCode?: string;
  recommendationTitle?: string;
  storageKey?: string;
};

const sameCustomItems = (left: CustomCartItem[], right: CustomCartItem[]) => {
  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.id === other.id &&
      item.name === other.name &&
      item.comment === other.comment
    );
  });
};

const getCartCategoryTitle = (item: SelectedPrescription) => {
  if (item.categoryId === "scales") return "Диагностика";
  if (item.categoryId === "vaccination") return "Лечение";
  if (item.categoryId === "lifestyle") return "Прочее";

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
  selectedItems
    .slice()
    .sort(
      (left, right) =>
        getChecklistCategoryPosition(left.categoryId) -
        getChecklistCategoryPosition(right.categoryId),
    )
    .reduce<Record<string, SelectedPrescription[]>>((acc, item) => {
      const categoryTitle = getCartCategoryTitle(item);
      acc[categoryTitle] = [...(acc[categoryTitle] ?? []), item];
      return acc;
    }, {});

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
  const customItemsRef = useRef<CustomCartItem[]>([]);
  const generalCommentRef = useRef("");
  const cartItemsCount = selectedItems.length + customItems.length;
  const hasSelectedItems = cartItemsCount > 0;
  const groupedItems = groupSelectedItemsByCartCategory(selectedItems);

  customItemsRef.current = customItems;
  generalCommentRef.current = generalComment;

  useEffect(() => {
    getCartSync().start();
  }, []);

  useEffect(() => {
    if (!storageKey) {
      setCustomItems([]);
      setGeneralComment("");
      setLoadedCustomItemsStorageKey("");
      setLoadedGeneralCommentStorageKey("");
      return;
    }

    const nextCustomItems = cartStorage.readCustomItems(storageKey);
    const nextComment = cartStorage.readGeneralComment(storageKey);
    setCustomItems(nextCustomItems);
    setGeneralComment(nextComment);
    customItemsRef.current = nextCustomItems;
    generalCommentRef.current = nextComment;
    setLoadedCustomItemsStorageKey(storageKey);
    setLoadedGeneralCommentStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || loadedCustomItemsStorageKey !== storageKey) return;

    cartStorage.writeCustomItems(storageKey, customItems);
  }, [customItems, loadedCustomItemsStorageKey, storageKey]);

  useEffect(() => {
    if (!storageKey || loadedGeneralCommentStorageKey !== storageKey) return;

    cartStorage.writeGeneralComment(storageKey, generalComment);
  }, [generalComment, loadedGeneralCommentStorageKey, storageKey]);

  useEffect(() => {
    return subscribeCartSync((message) => {
      if (!storageKey) return;
      // Локальный publish уже совпадает с React-state этой вкладки.
      if (message.origin === "local") return;

      if (message.scopes.includes("cleared")) {
        setCustomItems([]);
        setGeneralComment("");
        customItemsRef.current = [];
        generalCommentRef.current = "";
        return;
      }

      if (message.scopes.includes("customItems")) {
        const nextCustomItems = cartStorage.readCustomItems(storageKey);
        if (!sameCustomItems(customItemsRef.current, nextCustomItems)) {
          setCustomItems(nextCustomItems);
          customItemsRef.current = nextCustomItems;
        }
      }

      if (message.scopes.includes("generalComments")) {
        const nextComment = cartStorage.readGeneralComment(storageKey);
        if (generalCommentRef.current !== nextComment) {
          setGeneralComment(nextComment);
          generalCommentRef.current = nextComment;
        }
      }
    });
  }, [storageKey]);

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

  const renderCustomItems = (rowOffset = 0) =>
    customItems.map((item, index) => (
      <div
        key={item.id}
        className={`${styles.itemRow} ${
          (rowOffset + index) % 2 === 1 ? styles.itemRowAlt : ""
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
    ));

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
            <div className={styles.groupRow}>
              {groupTitle} ({items.length + (groupTitle === "Прочее" ? customItems.length : 0)})
            </div>
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
            {groupTitle === "Прочее" ? renderCustomItems(items.length) : null}
          </div>
        ))}

        {!groupedItems["Прочее"] && customItems.length > 0 ? (
          <div className={styles.groupRow}>Прочее ({customItems.length})</div>
        ) : null}
        {!groupedItems["Прочее"] ? renderCustomItems() : null}
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
                  id: createBrowserId(),
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
            setGeneralComment(template.generalComment ?? "");
            setIsSelectTemplateModalOpen(false);
          }}
          onClose={() => setIsSelectTemplateModalOpen(false)}
        />
      ) : null}

      {isSaveTemplateModalOpen ? (
        <SaveTemplateModal
          selectedItems={selectedItems}
          customItems={customItems}
          generalComment={generalComment}
          diagnosisCode={diagnosisCode}
          recommendationTitle={recommendationTitle}
          onClose={() => setIsSaveTemplateModalOpen(false)}
        />
      ) : null}
    </aside>
  );
}
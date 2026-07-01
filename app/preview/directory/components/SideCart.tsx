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
import type { CartTemplate } from "@/app/preview/directory/components/cartTemplatesStorage";
import styles from "./SideCart.module.css";
import deleteAllIcon from "@/assets/images/delete-all.svg";
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
  storageKey?: string;
};

const CUSTOM_ITEMS_STORAGE_KEY = "directoryCartCustomItems";

type StoredCustomCartItems = Record<string, CustomCartItem[]>;

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
  storageKey = "",
}: SideCartProps) {
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState<CustomCartItem[]>([]);
  const [loadedCustomItemsStorageKey, setLoadedCustomItemsStorageKey] = useState("");
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState<CustomCartItem | null>(null);
  const hasSelectedItems = selectedItems.length > 0 || customItems.length > 0;

  useEffect(() => {
    if (!storageKey) {
      setCustomItems([]);
      setLoadedCustomItemsStorageKey("");
      return;
    }

    setCustomItems(getStoredCustomItems(storageKey));
    setLoadedCustomItemsStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || loadedCustomItemsStorageKey !== storageKey) return;

    writeStoredCustomItems(storageKey, customItems);
  }, [customItems, loadedCustomItemsStorageKey, storageKey]);

  const groupedItems = selectedItems.reduce<Record<string, SelectedPrescription[]>>(
    (acc, item) => {
      acc[item.groupTitle] = [...(acc[item.groupTitle] ?? []), item];
      return acc;
    },
    {},
  );

  return (
    <aside className={styles.sideCart}>
      <CartTemplateToggle
        onSelectTemplateClick={() => setIsSelectTemplateModalOpen(true)}
        onSaveTemplateClick={() => setIsSaveTemplateModalOpen(true)}
      />

      <div className={styles.headerRow}>
        <h2 className={styles.title}>Корзина назначений</h2>
        {hasSelectedItems ? (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Удалить всё из корзины"
            onClick={() => {
              onDeleteAll?.();
              setCustomItems([]);
            }}
          >
            <Image src={deleteAllIcon} alt="" width={22} height={22} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <section className={styles.listPlaceholder} aria-label="Список назначений">
        {Object.entries(groupedItems).map(([groupTitle, items]) => (
          <div key={groupTitle}>
            <div className={styles.groupRow}>{groupTitle}</div>
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

        {customItems.length > 0 ? (
          <div>
            <div className={styles.groupRow}>Добавлено прочее</div>
            {customItems.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.itemRow} ${index % 2 === 1 ? styles.itemRowAlt : ""}`}
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
          </div>
        ) : null}
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
        <RecommendationField />
      </div>

      <div className={styles.actionPanelWrap}>
        <ActionPanel selectedItems={selectedItems} customItems={customItems} />
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
          onSelectTemplate={(template) => {
            onApplyTemplate?.(template);
            setIsSelectTemplateModalOpen(false);
          }}
          onClose={() => setIsSelectTemplateModalOpen(false)}
        />
      ) : null}

      {isSaveTemplateModalOpen ? (
        <SaveTemplateModal
          selectedItems={selectedItems}
          diagnosisCode={diagnosisCode}
          onClose={() => setIsSaveTemplateModalOpen(false)}
        />
      ) : null}
    </aside>
  );
}
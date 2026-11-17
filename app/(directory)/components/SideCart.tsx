"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  buildStoredCustomCartItem,
  cartStorage,
  getCartSync,
  isCustomDrugItem,
  isCustomServiceItem,
  mergeCustomCartItemValues,
  sameCustomCartItems,
  subscribeCartSync,
  type CustomCartItemValues,
  type StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";
import {
  EMPTY_ASSIGNMENT_SNAPSHOT,
  hasIndividualAssignmentClarifications,
  type ChecklistAssignmentSnapshot,
} from "./medications/assignmentSnapshot";
import { copyCartSelection } from "./cartClipboard";
import styles from "./SideCart.module.css";
import trashIcon from "@/assets/images/delete-icon.svg";
import deleteIcon from "@/assets/images/delete.svg";
import clarificationIcon from "@/assets/images/message-square-text.svg";

const CLARIFICATION_TOOLTIP =
  "Есть индивидуальные уточнения к назначению.";

export type CustomCartItem = StoredCustomCartItem;

export type SideCartHandle = {
  addCustomItem: (values: CustomCartItemValues) => void;
  updateCustomItem: (id: string, values: CustomCartItemValues) => void;
  removeCustomItem: (id: string) => void;
  setGeneralComment: (value: string) => void;
  /**
   * Актуальное состояние корзины (не storage snapshot) и та же запись,
   * что у кнопки «Скопировать выбранное» в полноразмерной корзине.
   * targetDocument — документ, в котором произошло нажатие (вкладка или PiP).
   */
  copySelectedToClipboard: (
    targetDocument: Document,
  ) => Promise<{ itemsCount: number }>;
};

type SideCartProps = {
  selectedItems?: SelectedPrescription[];
  /** Живой снимок назначений (тот же, что пишет checklist / cartStorage). */
  assignment?: ChecklistAssignmentSnapshot;
  onDeleteItem?: (id: string) => void;
  onDeleteAll?: () => void;
  onApplyTemplate?: (template: CartTemplate) => void;
  diagnosisCode?: string;
  recommendationTitle?: string;
  storageKey?: string;
};

type ClarificationTooltipState = {
  left: number;
  top: number;
};

const ClarificationIndicator = () => {
  const [tooltip, setTooltip] = useState<ClarificationTooltipState | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const hideTooltip = () => setTooltip(null);

  const showTooltip = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      // Иконка у правого края SideCart — якорим тултип справа, чтобы он рос влево.
      left: Math.max(12, rect.right),
      top: Math.max(8, rect.top - 8),
    });
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={styles.clarificationIndicator}
        role="img"
        aria-label={CLARIFICATION_TOOLTIP}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        <Image
          src={clarificationIcon}
          alt=""
          width={14}
          height={14}
          className={styles.clarificationIndicatorImg}
          aria-hidden="true"
        />
      </span>
      {tooltip && typeof document !== "undefined"
        ? createPortal(
            <span
              className={styles.clarificationTooltip}
              style={{
                left: tooltip.left,
                top: tooltip.top,
                transform: "translate(-100%, -100%)",
              }}
              role="tooltip"
            >
              {CLARIFICATION_TOOLTIP}
            </span>,
            document.body,
          )
        : null}
    </>
  );
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

const SideCart = forwardRef<SideCartHandle, SideCartProps>(function SideCart(
  {
    selectedItems = [],
    assignment = EMPTY_ASSIGNMENT_SNAPSHOT,
    onDeleteItem,
    onDeleteAll,
    onApplyTemplate,
    diagnosisCode = "",
    recommendationTitle = "",
    storageKey = "",
  },
  ref,
) {
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
  const [customItems, setCustomItems] = useState<CustomCartItem[]>([]);
  const [generalComment, setGeneralComment] = useState("");
  const [loadedCustomItemsStorageKey, setLoadedCustomItemsStorageKey] = useState("");
  const [loadedGeneralCommentStorageKey, setLoadedGeneralCommentStorageKey] = useState("");
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [editingCustomItem, setEditingCustomItem] = useState<CustomCartItem | null>(null);
  const [saveTemplateError, setSaveTemplateError] = useState("");
  const selectedItemsRef = useRef(selectedItems);
  const customItemsRef = useRef<CustomCartItem[]>([]);
  const generalCommentRef = useRef("");
  const cartItemsCount = selectedItems.length + customItems.length;
  const hasSelectedItems = cartItemsCount > 0;
  const groupedItems = groupSelectedItemsByCartCategory(selectedItems);

  selectedItemsRef.current = selectedItems;
  customItemsRef.current = customItems;
  generalCommentRef.current = generalComment;

  const customDrugItems = customItems.filter(isCustomDrugItem);
  const customServiceItems = customItems.filter(isCustomServiceItem);

  useImperativeHandle(
    ref,
    () => ({
      addCustomItem: (values) => {
        setCustomItems((prev) => [
          ...prev,
          buildStoredCustomCartItem(createBrowserId(), values),
        ]);
      },
      updateCustomItem: (id, values) => {
        setCustomItems((prev) =>
          prev.map((item) =>
            item.id === id ? mergeCustomCartItemValues(item, values) : item,
          ),
        );
      },
      removeCustomItem: (id) => {
        setCustomItems((prev) => prev.filter((item) => item.id !== id));
      },
      setGeneralComment: (value) => {
        setGeneralComment(value);
      },
      copySelectedToClipboard: (targetDocument) =>
        copyCartSelection({
          selectedItems: selectedItemsRef.current,
          customItems: customItemsRef.current,
          generalComment: generalCommentRef.current,
          targetDocument,
        }),
    }),
    [],
  );

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
        if (!sameCustomCartItems(customItemsRef.current, nextCustomItems)) {
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

  const renderCustomItems = (
    items: CustomCartItem[],
    rowOffset = 0,
  ) =>
    items.map((item, index) => (
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

  const customCountForGroup = (groupTitle: string) => {
    if (groupTitle === "Лечение") return customDrugItems.length;
    if (groupTitle === "Прочее") return customServiceItems.length;
    return 0;
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
            <div className={styles.groupRow}>
              {groupTitle} ({items.length + customCountForGroup(groupTitle)})
            </div>
            {items.map((item, index) => {
              const showClarification = hasIndividualAssignmentClarifications(
                item.id,
                assignment,
              );

              return (
                <div
                  key={item.id}
                  className={`${styles.itemRow} ${index % 2 === 1 ? styles.itemRowAlt : ""}`}
                >
                  <span className={styles.itemTitle}>{item.title}</span>
                  <span className={styles.itemActions}>
                    {showClarification ? <ClarificationIndicator /> : null}
                    <button
                      type="button"
                      className={styles.deleteButton}
                      aria-label={`Удалить ${item.title}`}
                      onClick={() => onDeleteItem?.(item.id)}
                    >
                      <Image src={deleteIcon} alt="" width={14} height={14} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              );
            })}
            {groupTitle === "Лечение"
              ? renderCustomItems(customDrugItems, items.length)
              : null}
            {groupTitle === "Прочее"
              ? renderCustomItems(customServiceItems, items.length)
              : null}
          </div>
        ))}

        {!groupedItems["Лечение"] && customDrugItems.length > 0 ? (
          <>
            <div className={styles.groupRow}>
              Лечение ({customDrugItems.length})
            </div>
            {renderCustomItems(customDrugItems)}
          </>
        ) : null}

        {!groupedItems["Прочее"] && customServiceItems.length > 0 ? (
          <>
            <div className={styles.groupRow}>
              Прочее ({customServiceItems.length})
            </div>
            {renderCustomItems(customServiceItems)}
          </>
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
          initialItem={editingCustomItem}
          initialKind="drug"
          onClose={() => {
            setEditingCustomItem(null);
            setIsCustomItemModalOpen(false);
          }}
          onSubmit={(values) => {
            if (editingCustomItem) {
              setCustomItems((prev) =>
                prev.map((item) =>
                  item.id === editingCustomItem.id
                    ? mergeCustomCartItemValues(item, values)
                    : item,
                ),
              );
            } else {
              setCustomItems((prev) => [
                ...prev,
                buildStoredCustomCartItem(createBrowserId(), values),
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
});

export default SideCart;
"use client";

import { useEffect } from "react";
import type {
  CustomCartItemKind,
  StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";
import CustomCartItemForm, {
  DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH,
  type CustomCartItemDrugSearch,
  type CustomCartItemFormSubmit,
} from "./CustomCartItemForm";
import styles from "./SideCart.module.css";

export type CustomCartItemModalSubmit = CustomCartItemFormSubmit;
export type { CustomCartItemDrugSearch };

type CustomCartItemModalProps = {
  mode: "add" | "edit";
  initialItem?: StoredCustomCartItem | null;
  initialName?: string;
  initialComment?: string;
  /** Стартовая вкладка в режиме add; в edit берётся из initialItem.kind. */
  initialKind?: CustomCartItemKind;
  drugSearch?: CustomCartItemDrugSearch;
  onClose: () => void;
  onSubmit: (values: CustomCartItemModalSubmit) => void;
};

const formClassNames = {
  header: styles.modalHeader,
  title: styles.modalTitle,
  closeButton: styles.closeButton,
  typeTabs: styles.modalTypeTabs,
  typeTab: styles.modalTypeTab,
  typeTabActive: styles.modalTypeTabActive,
  lead: styles.modalLead,
  picked: styles.modalPicked,
  step: styles.modalStep,
  changeLink: styles.modalChangeLink,
  results: styles.modalResults,
  result: styles.modalResult,
  empty: styles.modalEmpty,
  input: styles.input,
  inputError: styles.inputError,
  textarea: styles.textarea,
  commentInput: styles.commentInput,
  helperRow: styles.helperRow,
  errorText: styles.errorText,
  actions: styles.modalActions,
  button: styles.modalButton,
  buttonSecondary: styles.modalButtonSecondary,
  buttonPrimary: styles.modalButtonPrimary,
};

export default function CustomCartItemModal({
  mode,
  initialItem = null,
  initialName = "",
  initialComment = "",
  initialKind = "drug",
  drugSearch = DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH,
  onClose,
  onSubmit,
}: CustomCartItemModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "add"
            ? "Добавить услугу/медикамент"
            : "Редактировать услугу/медикамент"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <CustomCartItemForm
          mode={mode}
          initialItem={initialItem}
          initialName={initialName}
          initialComment={initialComment}
          initialKind={initialKind}
          drugSearch={drugSearch}
          classNames={formClassNames}
          layout="flat"
          onClose={onClose}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

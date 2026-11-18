"use client";

import { useEffect } from "react";
import CustomCartItemForm, {
  DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH,
  type CustomCartItemDrugSearch,
  type CustomCartItemFormSubmit,
} from "@/app/(directory)/components/CustomCartItemForm";
import type { StoredCustomCartItem } from "@/app/(directory)/shared/cart";
import { useMiniCartPortal } from "../context/MiniCartPortalContext";
import MiniCartPortal from "./MiniCartPortal";

export type MiniCartAddModalSubmit = CustomCartItemFormSubmit;

type MiniCartAddModalProps = {
  mode: "add" | "edit";
  initialItem?: StoredCustomCartItem | null;
  initialName?: string;
  initialComment?: string;
  /** Тот же контракт поиска, что у полноразмерной корзины (по умолчанию unavailable). */
  drugSearch?: CustomCartItemDrugSearch;
  onClose: () => void;
  onSubmit: (values: MiniCartAddModalSubmit) => void;
};

const formClassNames = {
  header: "preparaty__cart-modal-head",
  title: "",
  closeButton: "preparaty__cart-modal-close",
  typeTabs: "preparaty__cart-modal-types",
  typeTab: "preparaty__cart-modal-type",
  typeTabActive: "is-active",
  lead: "preparaty__cart-modal-lead",
  picked: "preparaty__cart-modal-picked",
  step: "preparaty__cart-modal-step",
  changeLink: "preparaty__cart-modal-change",
  results: "preparaty__cart-modal-results",
  result: "preparaty__cart-modal-result",
  empty: "preparaty__cart-modal-empty",
  input: "preparaty__cart-modal-input",
  inputError: "is-error",
  textarea: "preparaty__cart-modal-textarea",
  commentInput: "",
  helperRow: "preparaty__cart-modal-helper",
  errorText: "is-error",
  actions: "preparaty__cart-modal-actions",
  button: "preparaty__cart-modal-btn",
  buttonSecondary: "preparaty__cart-modal-btn--secondary",
  buttonPrimary: "preparaty__cart-modal-btn--primary",
  scrollBody: "preparaty__cart-modal-scroll",
};

export default function MiniCartAddModal({
  mode,
  initialItem = null,
  initialName = "",
  initialComment = "",
  drugSearch = DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH,
  onClose,
  onSubmit,
}: MiniCartAddModalProps) {
  const { ownerDocument } = useMiniCartPortal();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const view = ownerDocument.defaultView;
    view?.addEventListener("keydown", handleKeyDown);
    return () => view?.removeEventListener("keydown", handleKeyDown);
  }, [onClose, ownerDocument]);

  const dialogLabel =
    mode === "add"
      ? "Добавить услугу/медикамент"
      : "Редактировать услугу/медикамент";

  return (
    <MiniCartPortal>
      <div
        className="preparaty__cart-modal-layer"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="preparaty__cart-modal preparaty__cart-modal--compact"
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          onClick={(event) => event.stopPropagation()}
        >
          <CustomCartItemForm
            mode={mode}
            initialItem={initialItem}
            initialName={initialName}
            initialComment={initialComment}
            initialKind="drug"
            drugSearch={drugSearch}
            classNames={formClassNames}
            layout="scroll"
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </MiniCartPortal>
  );
}

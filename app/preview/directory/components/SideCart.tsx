"use client";

import { useState } from "react";
import ActionPanel from "./ActionPanel";
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

type SideCartProps = {
  selectedItems?: SelectedPrescription[];
  onDeleteItem?: (id: string) => void;
  onDeleteAll?: () => void;
  onApplyTemplate?: (template: CartTemplate) => void;
};

export default function SideCart({
  selectedItems = [],
  onDeleteItem,
  onDeleteAll,
  onApplyTemplate,
}: SideCartProps) {
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isSelectTemplateModalOpen, setIsSelectTemplateModalOpen] = useState(false);
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
        <button
          type="button"
          className={styles.clearButton}
          aria-label="Удалить всё из корзины"
          onClick={onDeleteAll}
        >
          <Image src={deleteAllIcon} alt="" width={22} height={22} aria-hidden="true" />
        </button>
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
      </section>

      <button type="button" className={styles.addButton}>
        <span className={styles.plus}>+</span>
        <span className={styles.addText}>Добавить услугу/медикамент</span>
      </button>

      <div className={styles.recommendationWrap}>
        <RecommendationField />
      </div>

      <div className={styles.actionPanelWrap}>
        <ActionPanel />
      </div>

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
          onClose={() => setIsSaveTemplateModalOpen(false)}
        />
      ) : null}
    </aside>
  );
}
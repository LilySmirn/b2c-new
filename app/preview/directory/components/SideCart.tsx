import ActionPanel from "./ActionPanel";
import CartTemplateToggle from "./CartTemplateToggle";
import Image from "next/image";
import type { SelectedPrescription } from "./PrescriptionChecklist";
import RecommendationField from "./RecommendationField";
import styles from "./SideCart.module.css";
import deleteIcon from "@/assets/images/delete-icon.svg";

type SideCartProps = {
  selectedItems?: SelectedPrescription[];
  onDeleteItem?: (id: string) => void;
};

export default function SideCart({ selectedItems = [], onDeleteItem }: SideCartProps) {
  const groupedItems = selectedItems.reduce<Record<string, SelectedPrescription[]>>(
    (acc, item) => {
      acc[item.groupTitle] = [...(acc[item.groupTitle] ?? []), item];
      return acc;
    },
    {},
  );

  return (
    <aside className={styles.sideCart}>
      <CartTemplateToggle />

      <div className={styles.headerRow}>
        <h2 className={styles.title}>Корзина назначений</h2>
        <button type="button" className={styles.clearButton}>
          Удалить всё
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
                  <Image src={deleteIcon} alt="Удалить" width={17} height={17} />
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
    </aside>
  );
}
import ActionPanel from "./ActionPanel";
import CartTemplateToggle from "./CartTemplateToggle";
import RecommendationField from "./RecommendationField";
import styles from "./SideCart.module.css";

type SideCartProps = { itemsCount?: number };

export default function SideCart({ itemsCount = 0 }: SideCartProps) {
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
        <p>Отмечено назначений: {itemsCount}</p>
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
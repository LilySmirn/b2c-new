import styles from "./SideCart.module.css";

type SideCartProps = { itemsCount?: number };

export default function SideCart({ itemsCount = 0 }: SideCartProps) {
  return (
    <aside className={styles.sideCart}>
      <h2>SideCart (забронировано)</h2>
      <p>Эта зона оставлена под боковую корзину шириной 390px.</p>
      <p>Тестовых назначений: {itemsCount}</p>
    </aside>
  );
}
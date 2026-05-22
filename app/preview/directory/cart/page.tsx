import PrescriptionChecklist from "../components/PrescriptionChecklist";
import SideCart from "../components/SideCart";
import styles from "./cart.module.css";

export default function CartPreviewPage() {
  return (
    <main className={styles.page}>
      <section className={styles.layout}>
        <PrescriptionChecklist />
        <SideCart itemsCount={8} />
      </section>
    </main>
  );
}
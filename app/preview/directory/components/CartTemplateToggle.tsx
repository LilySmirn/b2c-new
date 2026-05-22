import styles from "./CartTemplateToggle.module.css";

export default function CartTemplateToggle() {
  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button}>
        Выбрать шаблон
      </button>
      <button type="button" className={styles.button}>
        Сохранить как шаблон
      </button>
    </div>
  );
}
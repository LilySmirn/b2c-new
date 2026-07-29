import styles from "./CartTemplateToggle.module.css";

type CartTemplateToggleProps = {
  onSelectTemplateClick?: () => void;
  onSaveTemplateClick?: () => void;
};

export default function CartTemplateToggle({
  onSelectTemplateClick,
  onSaveTemplateClick,
}: CartTemplateToggleProps) {
  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={onSelectTemplateClick}
      >
        Выбрать шаблон
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={onSaveTemplateClick}
      >
        Сохранить как шаблон
      </button>
    </div>
  );
}
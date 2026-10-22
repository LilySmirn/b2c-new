import styles from "./InteractionsPanel.module.css";

/**
 * Блок проверки межлекарственных взаимодействий на вкладке «Препараты».
 * Пока `false`: панель не рендерится, её код и обработка `interactions` остаются.
 * Чтобы снова показать блок, поставьте `true`.
 */
export const SHOW_MEDICATION_INTERACTIONS = false;

/**
 * Временный демонстрационный режим.
 * Содержимое не зависит от выбранных строк.
 * Позднее заменить статическое содержимое на данные проверки взаимодействий.
 *
 * Описание — запасной текст из `renderInteractions` (`logic.js`):
 * в `design/cart/` нет `interactions.json` с комментарием пары.
 */
const DEMO_INTERACTION = {
  total: 2,
  indexLabel: "1 из 2",
  leftName: "Ребамипид",
  rightName: "Тетрациклин",
  badge: "Нельзя",
  text: "Есть сведения о взаимодействии.",
  source:
    "Источник: ГРЛС / база взаимодействий. Результат справочный, решение принимает врач.",
};

export default function InteractionsPanel() {
  return (
    <section
      className={styles.panel}
      aria-label="Межлекарственные взаимодействия"
    >
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          !
        </span>
        <p className={styles.title}>
          Выявлено межлекарственное взаимодействие ({DEMO_INTERACTION.total})
        </p>
        <div className={styles.nav} aria-label="Листание взаимодействий">
          <button
            type="button"
            className={styles.navBtn}
            disabled
            aria-disabled="true"
            aria-label="Предыдущее"
          >
            ‹
          </button>
          <span className={styles.navCount}>{DEMO_INTERACTION.indexLabel}</span>
          <button
            type="button"
            className={styles.navBtn}
            disabled
            aria-disabled="true"
            aria-label="Следующее"
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <p className={styles.pair}>
          <button
            type="button"
            className={styles.drug}
            disabled
            aria-disabled="true"
          >
            {DEMO_INTERACTION.leftName}
          </button>
          <span aria-hidden="true">+</span>
          <button
            type="button"
            className={styles.drug}
            disabled
            aria-disabled="true"
          >
            {DEMO_INTERACTION.rightName}
          </button>
          <span className={styles.badge}>{DEMO_INTERACTION.badge}</span>
        </p>
        <p className={styles.text}>{DEMO_INTERACTION.text}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            disabled
            aria-disabled="true"
          >
            К строкам препаратов
          </button>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={styles.footMark} aria-hidden="true">
          i
        </span>
        <div>{DEMO_INTERACTION.source}</div>
      </div>
    </section>
  );
}

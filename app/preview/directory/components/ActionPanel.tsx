import styles from "./ActionPanel.module.css";

const actions = [
  {
    id: "chart",
    label: "Запись\nв карту",
    icon: "/assets/images/action-panel-1.png",
  },
  {
    id: "copy",
    label: "Скопировать\nвыбранное",
    icon: "/assets/images/action-panel-2.png",
  },
  {
    id: "doc",
    label: "Сформировать\nдокумент",
    icon: "/assets/images/action-panel-3.png",
  },
];

export default function ActionPanel() {
  return (
    <div className={styles.panel}>
      {actions.map((action) => (
        <button key={action.id} type="button" className={styles.actionButton}>
          <img
            className={styles.icon}
            src={action.icon}
            alt=""
            width={18}
            height={18}
            aria-hidden="true"
          />
          <span className={styles.label}>
            {action.label.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}
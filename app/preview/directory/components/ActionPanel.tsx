import styles from "./ActionPanel.module.css";

const actions = [
  { id: "chart", label: "Запись\nв карту", icon: "📝" },
  { id: "copy", label: "Скопировать\nвыбранное", icon: "⧉" },
  { id: "doc", label: "Сформировать\nдокумент", icon: "📄" },
];

export default function ActionPanel() {
  return (
    <div className={styles.panel}>
      {actions.map((action) => (
        <button key={action.id} type="button" className={styles.actionButton}>
          <span className={styles.icon} aria-hidden="true">
            {action.icon}
          </span>
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
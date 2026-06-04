import Image from "next/image";
import chartIcon from "@/assets/images/action-panel-1.svg";
import copyIcon from "@/assets/images/action-panel-2.svg";
import documentIcon from "@/assets/images/action-panel-3.svg";
import styles from "./ActionPanel.module.css";

const actions = [
  {
    id: "chart",
    label: "Запись\nв карту",
    icon: chartIcon,
  },
  {
    id: "copy",
    label: "Скопировать\nвыбранное",
    icon: copyIcon,
  },
  {
    id: "doc",
    label: "Сформировать\nдокумент",
    icon: documentIcon,
  },
];

export default function ActionPanel() {
  return (
    <div className={styles.panel}>
      {actions.map((action) => (
        <button key={action.id} type="button" className={styles.actionButton}>
          <Image
            className={styles.icon}
            src={action.icon}
            alt=""
            width={20}
            height={20}
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
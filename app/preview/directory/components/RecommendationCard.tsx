import Image from "next/image";
import styles from "./RecommendationCard.module.css";
import eagleIcon from "@/assets/images/eagle.png";

type RecommendationCardProps = {
  title: string;
  externalUrl: string;
  idLabel: string;
  idValue: string;
  statusLabel: string;
  statusValue: string;
  ageCategoryLabel: string;
  ageCategoryValue: string;
  publicationDateLabel: string;
  publicationDateValue: string;
  approvalYearLabel: string;
  approvalYearValue: string;
  classificationLabel: string;
  classificationValue: string;
};

export default function RecommendationCard({
  title,
  externalUrl,
  idLabel,
  idValue,
  statusLabel,
  statusValue,
  ageCategoryLabel,
  ageCategoryValue,
  publicationDateLabel,
  publicationDateValue,
  approvalYearLabel,
  approvalYearValue,
  classificationLabel,
  classificationValue,
}: RecommendationCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <a
          className={styles.eagleLink}
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть внешний ресурс"
        >
          <Image src={eagleIcon} alt="Орел" className={styles.eagleIcon} />
        </a>
      </header>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <div className={styles.infoPair}>
            <span className={styles.label}>{idLabel}</span>
            <span className={`${styles.value} ${styles.idValue}`}>{idValue}</span>
          </div>

          <div className={styles.infoPair}>
            <span className={styles.label}>{statusLabel}</span>
            <span className={styles.value}>{statusValue}</span>
          </div>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{ageCategoryLabel}</span>
          <span className={styles.value}>{ageCategoryValue}</span>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{publicationDateLabel}</span>
          <span className={styles.value}>{publicationDateValue}</span>
        </div>

        <div className={styles.infoPair}>
          <span className={styles.label}>{approvalYearLabel}</span>
          <span className={styles.value}>{approvalYearValue}</span>
        </div>

        <div className={`${styles.infoPair} ${styles.classificationPair}`}>
          <span className={styles.label}>{classificationLabel}</span>
          <span className={styles.value}>{classificationValue}</span>
        </div>
      </div>
    </article>
  );
}
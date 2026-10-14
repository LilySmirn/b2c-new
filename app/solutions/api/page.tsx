import type { Metadata } from "next";
import Image from "next/image";
import styles from "./page.module.css";
import ApiHeroActions from "./ApiHeroActions";
import audienceIcon from "@/assets/images/api-page/main-icon.png";

export const metadata: Metadata = {
  title: "API и модули — EasyMed",
  description:
    "API, структурированные медицинские данные и готовые модули для интеграции в медицинские информационные системы.",
};

export default function ApiPage() {
  return (
    <section className={styles.hero} aria-labelledby="api-title">
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.badge}>API и модули</p>
          <h1 className={styles.title} id="api-title">
            API, структурированные<br />
            медицинские данные<br />
            и готовые модули
            <span className={styles.subtitle}>
              для интеграции в медицинские<br />
              информационные системы
            </span>
          </h1>
          <p className={styles.description}>
            EasyMed предоставляет структурированные клинические данные<br className={styles.desktopBreak} />
            и готовые медицинские решения, которые можно использовать<br className={styles.desktopBreak} />
            в собственных информационных системах и цифровых продуктах.
          </p>
          <p className={styles.audience}>
            <Image
              className={styles.audienceIcon}
              src={audienceIcon}
              alt=""
              width={22}
              height={18}
            />
            <span>
              Для разработчиков МИС, медицинских организаций<br className={styles.desktopBreak} />
              и ИТ-команд.
            </span>
          </p>
          <ApiHeroActions />
        </div>
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </section>
  );
}

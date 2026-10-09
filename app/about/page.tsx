import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "О компании — EasyMed",
  description:
    "EasyMed — технологическая компания. Создаём цифровые продукты и инфраструктуру для медицины.",
};

export default function AboutPage() {
  return (
    <section className={styles.hero} aria-labelledby="about-title" id="about">
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>ТЕХНОЛОГИЧЕСКАЯ КОМПАНИЯ</p>
          <h1 className={styles.title} id="about-title">
            EasyMed -<br />
            создаём цифровую<br />
            инфраструктуру<br />
            <span>для медицины</span>
          </h1>
          <p className={styles.description}>
            Мы создаём цифровые продукты и инфраструктуру,<br className={styles.desktopBreak} />
            которые помогают медицинским организациям, врачам<br className={styles.desktopBreak} />
            и разработчикам медицинских систем работать с клиническими<br className={styles.desktopBreak} />
            данными, контролировать качество медицинской помощи<br className={styles.desktopBreak} />
            и принимать управленческие решения.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryButton} href="mailto:info@easymed.pro">
              Обсудить интеграцию <span aria-hidden="true">⟶</span>
            </a>
            <a className={styles.secondaryButton} href="#about">О компании</a>
          </div>
        </div>
        <div className={styles.visual} aria-hidden="true" />
      </div>
    </section>
  );
}
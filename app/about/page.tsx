import type { Metadata } from "next";
import Image from "next/image";
import styles from "./page.module.css";
import AboutIllustration from "./AboutIllustration";
import productAnalytics from "@/assets/images/about/product-analytics.png";
import productApi from "@/assets/images/about/product-api.png";
import productDirectories from "@/assets/images/about/product-directories.png";

export const metadata: Metadata = {
  title: "О компании — EasyMed",
  description:
    "EasyMed — технологическая компания. Создаём цифровые продукты и инфраструктуру для медицины.",
};

const products = [
  {
    title: "Аналитика",
    description:
      "Контроль качества медицинской помощи и поддержка управленческих решений",
    icon: productAnalytics,
    alt: "Иконка аналитики",
  },
  {
    title: "API и модули",
    description:
      "Структурированные медицинские данные и готовые решения для интеграции в медицинские системы",
    icon: productApi,
    alt: "Иконка API и модулей",
  },
  {
    title: "Медицинские справочники",
    description:
      "Клинические рекомендации, МКБ-10 и другие медицинские данные для врачей и клиник",
    icon: productDirectories,
    alt: "Иконка медицинских справочников",
  },
] as const;

export default function AboutPage() {
  return (
    <>
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
          <div className={styles.visual}>
            <AboutIllustration />
          </div>
        </div>
      </section>

      <section
        className={styles.products}
        aria-labelledby="products-title"
        id="products"
      >
        <div className={styles.productsInner}>
          <div className={styles.productsHeader}>
            <div className={styles.productsHeading}>
              <p className={styles.productsEyebrow}>Продукты</p>
              <h2 className={styles.productsTitle} id="products-title">
                Наши продукты
              </h2>
            </div>
            <p className={styles.productsLead}>
              Единая экосистема решений для разных уровней
              медицинской системы
            </p>
          </div>

          <ul className={styles.productCards}>
            {products.map((product) => (
              <li key={product.title} className={styles.productCard}>
                <Image
                  className={styles.productIcon}
                  src={product.icon}
                  alt={product.alt}
                  width={62}
                  height={60}
                />
                <h3 className={styles.productCardTitle}>{product.title}</h3>
                <p className={styles.productCardDescription}>
                  {product.description}
                </p>
                <a className={styles.productMore} href="#">
                  Подробнее <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

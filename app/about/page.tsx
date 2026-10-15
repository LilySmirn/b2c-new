import type { Metadata } from "next";
import Image from "next/image";
import styles from "./page.module.css";
import AboutIllustration from "./AboutIllustration";
import productAnalytics from "@/assets/images/about/product-analytics.png";
import productApi from "@/assets/images/about/product-api.png";
import productDirectories from "@/assets/images/about/product-directories.png";
import whyEasymedBg from "@/assets/images/about/why-easymed-bg.png";
import whyIconDev from "@/assets/images/about/why-icon-dev.png";
import whyIconExpertise from "@/assets/images/about/why-icon-expertise.png";
import whyIconMis from "@/assets/images/about/why-icon-mis.png";
import whyIconSecurity from "@/assets/images/about/why-icon-security.png";
import helpIcon1 from "@/assets/images/about/help-icon-1.png";
import helpIcon2 from "@/assets/images/about/help-icon-2.png";
import helpIcon3 from "@/assets/images/about/help-icon-3.png";
import helpIcon4 from "@/assets/images/about/help-icon-4.png";
import IntegrationsSection from "./IntegrationsSection";
import CollaborationActions from "./CollaborationActions";
import AboutScrollAnimations from "./AboutScrollAnimations";
import collaborationBg from "@/assets/images/about/collaboration-bg.png";

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

const whyAdvantages = [
  {
    title: "Собственная разработка",
    icon: whyIconDev,
    width: 18,
    height: 23,
  },
  {
    title: "Экспертиза в медицине",
    icon: whyIconExpertise,
    width: 20,
    height: 23,
  },
  {
    title: "Интеграции с МИС",
    icon: whyIconMis,
    width: 21,
    height: 21,
  },
  {
    title: "Надежность и безопасность",
    icon: whyIconSecurity,
    width: 18,
    height: 23,
  },
] as const;

const helpAudiences = [
  {
    title: "Медицинские организации",
    icon: helpIcon1,
    alt: "Иконка медицинских организаций",
    items: [
      "Контроль качества лечения",
      "Аналитика и отчетность",
      "Эффективное управление",
    ],
  },
  {
    title: "Разработчики МИС",
    icon: helpIcon2,
    alt: "Иконка разработчиков МИС",
    items: ["Открытый API", "Готовые модули", "Простая интеграция"],
  },
  {
    title: "Руководители",
    icon: helpIcon3,
    alt: "Иконка руководителей",
    items: [
      "Ключевые показатели",
      "Выявление отклонений",
      "Поддержка решений",
    ],
  },
  {
    title: "Врачи",
    icon: helpIcon4,
    alt: "Иконка врачей",
    items: [
      "Быстрый доступ к КР",
      "Структурированная информация",
      "Удобный рабочий процесс",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <AboutScrollAnimations />
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

      <section
        className={styles.why}
        aria-labelledby="why-title"
        id="why-easymed"
      >
        <div className={styles.whyInner}>
          <div className={styles.whyBanner}>
            <Image
              className={styles.whyBannerBg}
              src={whyEasymedBg}
              alt=""
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            <div className={styles.whyContent}>
              <div className={styles.whyCopy}>
                <p className={styles.whyEyebrow}>Почему EasyMed</p>
                <h2 className={styles.whyTitle} id="why-title">
                  Технологии, которые работают на медицину
                </h2>
                <p className={styles.whyDescription}>
                  Мы объединяем клинические знания, данные и технологии, чтобы
                  сделать медицинскую помощь более современной, эффективной и
                  управляемой
                </p>
              </div>

              <ul className={styles.whyAdvantages}>
                {whyAdvantages.map((advantage) => (
                  <li key={advantage.title} className={styles.whyAdvantage}>
                    <span className={styles.whyIconPad} aria-hidden="true">
                      <Image
                        className={styles.whyIcon}
                        src={advantage.icon}
                        alt=""
                        width={advantage.width}
                        height={advantage.height}
                      />
                    </span>
                    <span className={styles.whyAdvantageTitle}>
                      {advantage.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.help}
        aria-labelledby="help-title"
        id="who-we-help"
      >
        <div className={styles.helpInner}>
          <div className={styles.helpHeader}>
            <div className={styles.helpHeading}>
              <p className={styles.helpEyebrow}>Пользователи</p>
              <h2 className={styles.helpTitle} id="help-title">
                Кому мы помогаем
              </h2>
            </div>
            <p className={styles.helpLead}>
              Наши продукты решают задачи на разных уровнях медицинской системы
            </p>
          </div>

          <ul className={styles.helpCards}>
            {helpAudiences.map((audience) => (
              <li key={audience.title} className={styles.helpCard}>
                <Image
                  className={styles.helpIcon}
                  src={audience.icon}
                  alt={audience.alt}
                  width={62}
                  height={60}
                />
                <h3 className={styles.helpCardTitle}>{audience.title}</h3>
                <ul className={styles.helpList}>
                  {audience.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a className={styles.helpMore} href="#">
                  Подробнее <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <IntegrationsSection />

      <section
        className={styles.collaboration}
        aria-labelledby="collaboration-title"
        id="collaboration"
      >
        <div className={styles.collaborationInner}>
          <div className={styles.collaborationBanner}>
            <Image
              className={styles.collaborationBannerBg}
              src={collaborationBg}
              alt=""
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              priority={false}
            />

            <div className={styles.collaborationContent}>
              <div className={styles.collaborationCopy}>
                <p className={styles.collaborationEyebrow}>
                  Начать сотрудничество
                </p>
                <h2
                  className={styles.collaborationTitle}
                  id="collaboration-title"
                >
                  Давайте обсудим, как EasyMed
                  <br />
                  может быть полезен вашей системе
                </h2>
                <p className={styles.collaborationDescription}>
                  Расскажите о вашей задаче - мы подберём оптимальный
                  <br className={styles.collaborationDescBreak} />
                  формат интеграции и сотрудничества.
                </p>
              </div>

              <CollaborationActions />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";
import Link from 'next/link';
import FaqItem from "./components/FaqItem";
import CorporateAccess from "./components/CorporateAccess";
import VideoShowcase from "./components/VideoShowcase";
import ReviewsCarousel from "./components/ReviewsCarousel";
import Head from 'next/head';
import { Metadata } from "next";
import heroImage from "@/assets/images/landing/tablet.png";
import videoIcon from "@/assets/images/landing/video.png";
import minzdravIcon from "@/assets/images/landing/minzdrav.png";
import searchIcon from "@/assets/images/landing/search.png";
import starIcon from "@/assets/images/landing/star.png";
import peopleImage from "@/assets/images/landing/people.png";
import howSearchIcon from "@/assets/images/landing/search2.png";
import recommendationIcon from "@/assets/images/landing/recomendation.png";
import safeIcon from "@/assets/images/landing/safe.png";
import smartSearchIcon from "@/assets/images/landing/lamp.png";
import structureIcon from "@/assets/images/landing/structure.png";
import medicinesIcon from "@/assets/images/landing/medicaments.png";
import dentistryIcon from "@/assets/images/landing/stomathology.png";
import pdfIcon from "@/assets/images/landing/pdf.png";
import favoritesIcon from "@/assets/images/landing/fav.png";
import clientLogo01 from "@/assets/images/logos/Group 1000004580 1.png";
import clientLogo02 from "@/assets/images/logos/Group 1000004580 2.png";
import clientLogo03 from "@/assets/images/logos/Group 1000004580 3.png";
import clientLogo04 from "@/assets/images/logos/Group 1000004580 4.png";
import clientLogo05 from "@/assets/images/logos/Group 1000004581 1.png";
import clientLogo07 from "@/assets/images/logos/Sealife 1 1.png";
import clientLogo08 from "@/assets/images/logos/layer1 1.png";
import clientLogo09 from "@/assets/images/logos/photo_2025-12-02 14.42.45 1 1.png";
import clientLogo10 from "@/assets/images/logos/photo_2025-12-02 15.05.00 1 1.png";
import clientLogo11 from "@/assets/images/logos/photo_2025-12-02 15.24.23 1 1.png";
import clientLogo12 from "@/assets/images/logos/Айболит 1 1.png";
import clientLogo13 from "@/assets/images/logos/Бека Инвет 1 1.png";
import clientLogo14 from "@/assets/images/logos/Гиппократ 1 1.png";
import clientLogo15 from "@/assets/images/logos/Гранти-мед 1 1.png";
import clientLogo16 from "@/assets/images/logos/ДЦ Экспресс + 1 1.png";
import clientLogo17 from "@/assets/images/logos/Доктор Клин 1 1.png";
import clientLogo18 from "@/assets/images/logos/КИТ 1 1.png";
import clientLogo19 from "@/assets/images/logos/Ларус 1 1.png";
import clientLogo20 from "@/assets/images/logos/МО Новая больница (ТОП - 10 РФ) 1 1.png";
import clientLogo21 from "@/assets/images/logos/МХК Андромеда 1 1.png";
import clientLogo22 from "@/assets/images/logos/МЦ Здоровье 1 1.png";
import clientLogo23 from "@/assets/images/logos/Медицина Тольяти 1 1.png";
import clientLogo24 from "@/assets/images/logos/Петергоф 1 1.png";
import clientLogo25 from "@/assets/images/logos/Полимедика 1 1.png";
import clientLogo26 from "@/assets/images/logos/Слой_1 1.png";
import clientLogo27 from "@/assets/images/logos/Слой_x0020_1 1.png";
import clientLogo28 from "@/assets/images/logos/Сокол-мед 1 1.png";
import clientLogo29 from "@/assets/images/logos/ЦСМ Кронштат 1 1.png";
import clientLogo30 from "@/assets/images/logos/Центр здоровья 1 1.png";
import clientLogo31 from "@/assets/images/logos/рубин 1 1.png";
import { getB2cSessionStatus } from "./lib/requireActiveB2cSession";

export const metadata: Metadata = {
  title: "Клинические рекомендации по МКБ-10",
  description:
      "Быстрый доступ к актуальным клиническим рекомендациям Минздрава РФ 2024-2025 по МКБ-10. Удобный интерфейс, поиск, подписка.",
  alternates: {
    canonical: "https://klinrec.ru/",
  },
  openGraph: {
    type: "website",
    url: "https://klinrec.ru/",
    title: "Клинические рекомендации по МКБ-10",
    description:
        "Актуальный справочник клинических рекомендаций Минздрава РФ по МКБ-10.",
    images: [
      {
        url: 'https://klinrec.ru/images/preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Клинические рекомендации'
      }
    ],
  },
};

const clientLogos = [
  clientLogo01,
  clientLogo02,
  clientLogo03,
  clientLogo04,
  clientLogo05,
  clientLogo07,
  clientLogo08,
  clientLogo09,
  clientLogo10,
  clientLogo11,
  clientLogo12,
  clientLogo13,
  clientLogo14,
  clientLogo15,
  clientLogo16,
  clientLogo17,
  clientLogo18,
  clientLogo19,
  clientLogo20,
  clientLogo21,
  clientLogo22,
  clientLogo23,
  clientLogo24,
  clientLogo25,
  clientLogo26,
  clientLogo27,
  clientLogo28,
  clientLogo29,
  clientLogo30,
  clientLogo31,
];

export default async function Home() {
  const { session, isActive } = await getB2cSessionStatus();
  const recommendationsHref =
      session?.user?.accountType === "b2b" || isActive ? "/mkb" : "/login";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://klinrec.ru/#website",
        url: "https://klinrec.ru/",
        name: "Клинические рекомендации Минздрава по МКБ-10",
        description:
            "Быстрый доступ к актуальным клиническим рекомендациям Минздрава РФ 2024-2025 по МКБ-10. Удобный интерфейс, поиск, подписка.",
        publisher: {
          "@id": "https://klinrec.ru/#organization",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://klinrec.ru/#organization",
        name: "EasyMed",
        url: "https://klinrec.ru/",
        logo: {
          "@type": "ImageObject",
          url: "https://klinrec.ru/assets/images/logo.webp",
          height: 60,
          caption: "Клинические рекомендации Минздрава — логотип",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            email: "info@easymed.pro",
            contactType: "customer support",
            availableLanguage: ["Russian", "English"],
          },
        ],
        sameAs: ["https://t.me/easymed_admin"],
      },
      {
        "@type": "OfferCatalog",
        "@id": "https://klinrec.ru/#offers",
        name: "Подписки",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Базовый",
              description: "Подписка на 1 месяц",
            },
            price: "300",
            priceCurrency: "RUB",
            priceValidUntil: "2025-12-31",
            url: "https://klinrec.ru/#pricing",
            eligibleDuration: {
              "@type": "Duration",
              duration: "P1M",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Оптимальный",
              description: "Подписка на 3 месяца",
            },
            price: "750",
            priceCurrency: "RUB",
            priceValidUntil: "2025-12-31",
            url: "https://klinrec.ru/#pricing",
            eligibleDuration: {
              "@type": "Duration",
              duration: "P3M",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Расширенный",
              description: "Подписка на 6 месяцев",
            },
            price: "1200",
            priceCurrency: "RUB",
            priceValidUntil: "2025-12-31",
            url: "https://klinrec.ru/#pricing",
            eligibleDuration: {
              "@type": "Duration",
              duration: "P6M",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Премиум",
              description: "Подписка на 12 месяцев",
            },
            price: "1800",
            priceCurrency: "RUB",
            priceValidUntil: "2025-12-31",
            url: "https://klinrec.ru/#pricing",
            eligibleDuration: {
              "@type": "Duration",
              duration: "P1Y",
            },
          },
        ],
      },
    ],
  };

  return (
      <>
      <Head>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <main className="main">
        <section id="hero" className="hero-section">
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-eyebrow">Клинические рекомендации Минздрава РФ</div>
              <div className="hero-text">
                <h1 className="hero-title">
                  Клинические<br/>рекомендации<br/>Минздрава <span>за секунды</span>
                </h1>
                <p className="lead-text">
                  Актуальный справочник, созданный для врачей, клиник<br/>
                  и студентов. Находите рекомендации по диагнозу, МКБ-10<br/>
                  или ключевым словам — в один клик.
                </p>
              </div>
              <div className="hero-actions-flow">
                <div className="hero-buttons">
                  <Link href={recommendationsHref} className="btn btn-hero-demo">Попробовать бесплатно</Link>
                  <Link href="#video" className="btn btn-pricing hero-video-button">
                    <Image src={videoIcon} alt="" width={27} height={27}/>
                    Смотреть видео
                  </Link>
                </div>
                <div className="hero-benefits">
                  <div className="hero-benefit"><span><Image src={minzdravIcon} alt=""/></span><p>Актуальная база<br/>Минздрава РФ</p></div>
                  <div className="hero-benefit"><span><Image src={searchIcon} alt=""/></span><p>Удобный поиск<br/>за секунды</p></div>
                  <div className="hero-benefit"><span><Image src={starIcon} alt=""/></span><p>Клинические<br/>рекомендации от СтАР</p></div>
                </div>
                <div className="hero-trust">
                  <Image src={peopleImage} alt="" width={139} height={42}/>
                  <p>Уже используют более <span>5000 врачей</span><br/>в клиниках по всей России</p>
                </div>
              </div>
            </div>
            <div className="hero-img">
              <Image src={heroImage}
                     alt="Клинические рекомендации Минздрава РФ - иллюстрация"
                     width={818} height={666} priority/>
            </div>
          </div>
        </section>
        <section id="about" className="welcome-section">
          <h2 className="visually-hidden">Welcome section</h2>
          <div className="welcome-container">
            <p className="client-logos-title">
              Нам доверяют ведущие клиники и медицинские информационные системы
            </p>
            <div className="client-logos-viewport">
              <div className="client-logos-track" aria-label="Клиенты EasyMed">
                {[false, true].map((isDuplicate) => (
                  <div
                    key={String(isDuplicate)}
                    className="client-logos-group"
                    aria-hidden={isDuplicate || undefined}
                  >
                    {clientLogos.map((logo, index) => (
                      <span className="client-logo-card" key={logo.src}>
                        <Image
                          className="client-logo"
                          src={logo}
                          alt={isDuplicate ? "" : `Логотип клиента ${index + 1}`}
                        />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="how-it-works" className="how-it-works-section">
          <h2>Как это работает</h2>
          <div className="how-it-works-flow">
            {[
              { number: "01", icon: howSearchIcon, title: "Введите запрос", text: <>Поиск по МКБ-10,<br/>диагнозам, ключевым<br/>словам</> },
              { number: "02", icon: recommendationIcon, title: "Получите рекомендации", text: <>Структурированная<br/>информация по диагностике,<br/>лечению и профилактике</> },
              { number: "03", icon: safeIcon, title: "Применяйте на практике", text: <>Работайте по актуальным<br/>рекомендациям Минздрава<br/>и будьте уверены в решении</> },
            ].map((step, index) => (
              <div className="how-it-works-step" key={step.number}>
                <article className="how-it-works-card">
                  <div className="how-it-works-icon"><Image src={step.icon} alt="" /></div>
                  <div className="how-it-works-copy">
                    <span className="how-it-works-number">{step.number}</span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
                {index < 2 && <div className="how-it-works-connector" aria-hidden="true"><span/></div>}
              </div>
            ))}
          </div>
        </section>
        <VideoShowcase />
        <section id="capabilities" className="capabilities-section">
          <h2>Возможности EasyMed</h2>
          <div className="capabilities-list">
            {[
              { icon: smartSearchIcon, title: "Умный поиск", text: <>По диагнозу, МКБ-10 или<br/>ключевым словам</> },
              { icon: structureIcon, title: "Структура рекомендаций", text: <>Диагностика, лечение,<br/>профилактика и наблюдение</> },
              { icon: medicinesIcon, title: "Поиск лекарств", text: <>Информация о препаратах<br/>и схемах лечения</> },
              { icon: dentistryIcon, title: "Стоматология", text: <>Отдельный раздел для<br/>стоматологов</> },
              { icon: pdfIcon, title: "PDF и печать", text: <>Скачивайте и печатайте<br/>план лечения</> },
              { icon: favoritesIcon, title: "Избранное", text: <>Сохранение важного<br/>для быстрого доступа</> },
            ].map((capability) => (
              <article className="capability-card" key={capability.title}>
                <span className="capability-icon"><Image src={capability.icon} alt="" /></span>
                <h3>{capability.title}</h3>
                <p>{capability.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="product-stats-section" aria-labelledby="product-stats-title">
          <h2 id="product-stats-title" className="visually-hidden">EasyMed в цифрах</h2>
          <div className="product-stats">
            {[
              { value: "1000+", text: <>клинических<br/>рекомендаций</> },
              { value: "150+", text: <>стоматологических<br/>рекомендаций</> },
              { value: "30+", text: <>специальностей<br/>и направлений</> },
              { value: "24/7", text: <>доступ к актуальным<br/>данным</> },
              { value: "5000+", text: <>врачей уже<br/>используют</> },
            ].map((stat) => (
              <div className="product-stat" key={stat.value}>
                <strong>{stat.value}</strong>
                <p>{stat.text}</p>
              </div>
            ))}
          </div>
        </section>
        <ReviewsCarousel />
        <section id="pricing" className="pricing-section">
          <div className="pricing-container">
            <h2>Тарифы и цены</h2>
            <div className="pricing-cards">
              {[
                { name: "Базовый", duration: "1 месяц", price: "300 ₽" },
                { name: "Оптимальный", duration: "3 месяца", price: "750 ₽", popular: true },
                { name: "Расширенный", duration: "6 месяцев", price: "1 200 ₽" },
                { name: "Премиум", duration: "12 месяцев", price: "1 800 ₽" },
              ].map((tariff) => (
                <article className="pricing-card" key={tariff.name}>
                  {tariff.popular && <span className="pricing-badge">Популярный</span>}
                  <h3>{tariff.name}</h3>
                  <p className="pricing-duration">{tariff.duration}</p>
                  <p className="pricing-price">{tariff.price}</p>
                  <Link href="/login" className="btn-select" aria-label={`Выбрать тариф ${tariff.name}`}>
                    Выбрать тариф
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <CorporateAccess />

        <section id="faq" className="faq-section">
          <div className="faq-container">
            <h2 className="title">
              Часто задаваемые <span className="highlight">вопросы</span>
            </h2>
            <p className="description">
              Ответы на наиболее частые вопросы от наших пользователей
            </p>
            <div className="faq-content">

              <FaqItem
                  question="Можно ли отменить автосписание денежных средств в любое время?"
                  answer="Да, автосписание можно отключить в личном кабинете в разделе «Подписка»"
              />

              <FaqItem
                  question="Как оформить подписку на сайт?"
                  answer="Перейдите в раздел «Подписка», выберите нужный вариант и нажмите кнопку «Оплатить». После оплаты вы получите мгновенный доступ ко всем материалам. Дата окончания подписки будет отображаться в личном кабинете."
              />

              <FaqItem
                  question="Что будет включать подписка на сайт?"
                  answer={
                    <>
                    
                      <p>Подписка на сайт открывает безлимитный доступ к:</p>
                      <ul>
                        <li> - Всем актуальным клиническим рекомендациям</li>
                        <li> - Ежемесячным обновлениям и новым публикациям</li>
                      </ul>
                    </>
                  }
              />

              <FaqItem
                  question="На основе каких источников представлена информация?"
                  answer={
                    <>
                      Мы создаём клинреки на основе официальных клинических рекомендаций Минздрава РФ (
                      <Link className="minzdrav-link"
                          href="https://cr.minzdrav.gov.ru"
                          target="_blank"
                          rel="noopener noreferrer"
                      >
                        сайт Минздрава РФ
                      </Link>
                      ) и Стоматологической Ассоциации России (
                      <Link className="minzdrav-link"
                          href="https://e-stomatology.ru/director/protokols/"
                          target="_blank"
                          rel="noopener noreferrer"
                      >
                        сайт СтАР
                      </Link>
                      ).
                    </>
                  }
              />

              <FaqItem
                  question="Будут ли добавляться и обновляться рекомендации?"
                  answer={
                    <>
                      Да, мы ежемесячно добавляем новые рекомендации и материалы по запросам пользователей.<br/>
                      Обновления существующих клинреков проводятся при выходе новых утверждённых версий от Минздрава.<br/>
                      <strong><em>Все обновления входят в стоимость подписки.</em></strong>
                    </>
                  }
              />

              <FaqItem
                  question="Можно ли пользоваться сайтом без подписки?"
                  answer={
                    <>
                      Да, на сайте есть часть полезных материалов в открытом доступе.<br/>
                      Все клинические рекомендации доступны бесплатно, но с ограниченным количество запросов в день.<br/>
                      Для безлимитного доступа ко всем КР можете приобрести подписку.
                    </>
                  }
              />

              <FaqItem
                  question="Куда писать, если возникли технические проблемы?"
                  answer={
                    <>
                      <p>Оставьте заявку, мы свяжемся с вами</p>
                      <ul>
                        <li><strong>Email: </strong><Link href="mailto:info@easymed.pro">info@easymed.pro</Link></li>
                      </ul>
                    </>
                  }
              />

            </div>
          </div>
        </section>

        <section id="cta" className="cta-section">
          <div className="cta-container">
            <h2 className="title cta-title">
              Попробуйте бесплатно<br/>прямо сейчас!
            </h2>
            <Link href="/login" className="btn btn-demo-cta">Демо</Link>
          </div>
        </section>
        <section id="why-us" className="why-us-section">
          <div className="why-us-container">
            <h2 className="title why-us-title">
              Почему сайт <span className="highlight"><Link href="https://klinrec.ru" className="why-us-btn">klinrec.ru</Link></span> —
              лучший выбор?
            </h2>
          </div>
          <ul className="why-us-list">
            <li className="why-us-item">
              <span className="highlight">✓</span> Ориентирован на МКБ-10 и практическое применение
            </li>
            <li className="why-us-item">
              <span className="highlight">✓</span> Структура рекомендаций под реальные задачи врача
            </li>
            <li className="why-us-item">
              <span className="highlight">✓</span> Постоянно обновляется и развивается
            </li>
            <li className="why-us-item">
              <span className="highlight">✓</span> Уже помогает десяткам клиник по всей России
            </li>
          </ul>
        </section>
        <section className="cta-banner">
          <div className="cta-banner-container">
            <h2 className="title cta-banner-title">
              Если вы ищете
            </h2>
            <ul className="cta-banner-list">
              <li className="cta-banner-item">
                • Краткие, удобные клинические рекомендации Минздрава
              </li>
              <li className="cta-banner-item">
                • Возможность быстро ориентироваться по МКБ-10
              </li>
              <li className="cta-banner-item">
                • Актуальные данные без лишней теории
              </li>
            </ul>
            <h2 className="title cta-banner-title">
              Вы по адресу
            </h2>
            <h2 className="title cta-banner-title-2">
              <span className="highlight"><Link href="https://klinrec.ru" className="why-us-btn">klinrec.ru</Link></span> - ваш надёжный
              справочник
            </h2>
          </div>
        </section>
      </main>
      </>
  );
}

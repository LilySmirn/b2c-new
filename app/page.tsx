import Image from "next/image";
import Link from 'next/link';
import FaqItem from "./components/FaqItem";
import CorporateAccess from "./components/CorporateAccess";
import Head from 'next/head';
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Клинические рекомендации по МКБ-10",
  description:
      "Быстрый доступ к актуальным клиническим рекомендациям Минздрава РФ 2024-2025 по МКБ-10. Удобный интерфейс, поиск, тарифы.",
  alternates: {
    canonical: "https://klinicheskie-rekomendatsii.ru/",
  },
  openGraph: {
    type: "website",
    url: "https://klinicheskie-rekomendatsii.ru/",
    title: "Клинические рекомендации по МКБ-10",
    description:
        "Актуальный справочник клинических рекомендаций Минздрава РФ по МКБ-10.",
    images: [
      {
        url: 'https://klinicheskie-rekomendatsii.ru/images/preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Клинические рекомендации'
      }
    ],
  },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://klinicheskie-rekomendatsii.ru/#website",
        url: "https://klinicheskie-rekomendatsii.ru/",
        name: "Клинические рекомендации Минздрава по МКБ-10",
        description:
            "Быстрый доступ к актуальным клиническим рекомендациям Минздрава РФ 2024-2025 по МКБ-10. Удобный интерфейс, поиск, тарифы.",
        publisher: {
          "@id": "https://klinicheskie-rekomendatsii.ru/#organization",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://klinicheskie-rekomendatsii.ru/#organization",
        name: "EasyMed",
        url: "https://klinicheskie-rekomendatsii.ru/",
        logo: {
          "@type": "ImageObject",
          url: "https://klinicheskie-rekomendatsii.ru/assets/images/logo.webp",
          width: 250,
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
        sameAs: ["https://t.me/easymed_support"],
      },
      {
        "@type": "OfferCatalog",
        "@id": "https://klinicheskie-rekomendatsii.ru/#offers",
        name: "Тарифы на подписку",
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
            url: "https://klinicheskie-rekomendatsii.ru/#pricing",
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
            url: "https://klinicheskie-rekomendatsii.ru/#pricing",
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
            url: "https://klinicheskie-rekomendatsii.ru/#pricing",
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
            url: "https://klinicheskie-rekomendatsii.ru/#pricing",
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
              <div className="hero-text">
                <h1 className="h1">
                  Клинические рекомендации<br/>Минздрава РФ
                </h1>
                <p className="lead-text">
                  Актуальный справочник, созданный для врачей,
                  клиник и студентов. Находите рекомендации
                  по диагнозу, МКБ-10, направлению или
                  ключевым словам — в один клик.
                </p>
              </div>
              <div className="hero-buttons">
                <Link href="#" className="btn btn-hero-demo">Найти рекомендации</Link>
                <Link href="/login" className="btn btn-pricing">
                  Приобрести подписку
                </Link>
              </div>
            </div>
            <div className="hero-img">
              <Image src="/images/hero-img.png"
                     alt="Клинические рекомендации Минздрава РФ - иллюстрация"
                     width="638" height="442" loading="lazy"/>
            </div>
          </div>
        </section>
        <section id="about" className="welcome-section">
          <h2 className="visually-hidden">Welcome section</h2>
          <div className="welcome-container">
            <p className="description">
              Добро пожаловать в удобный справочник, где собраны актуальные <span
                className="highlight">клинические</span> <span className="highlight">рекомендации</span> по всем
              нозологиям — от официальных протоколов Минздрава РФ до специализированных подходов для взрослых и детей.
            </p>
            <p className="description description-2">
              Используйте поиск по МКБ-10, фильтры по возрасту, году утверждения или разделам медицины.
            </p>
            <hr/>
          </div>
        </section>
        <section id="usp" className="usp-section">
          <div className="usp-container">
            <h2 className="title">
              Всё, что нужно врачу, в одном <span className="highlight">справочнике</span>
            </h2>
            <p className="description">
              <span className="highlight bold">560+</span> актуальных клинических рекомендаций в удобном формате.
            </p>
            <p className="description">
              Мы собрали, сократили, отфильтровали — чтобы вы могли сразу работать.
            </p>
            <div className="usp-list">
              <div className="line-1">
                <div className="usp-item">
                  <div className="item-title usp-item-title">
                    Клинические<br/>рекомендации у детей
                  </div>
                  <div className="usp-item-text">
                    Отдельный модуль для педиатрии,<br/>протоколы детских заболеваний.
                  </div>
                </div>
                <div className="usp-item">
                  <p className="item-title usp-item-title">
                    Поиск по коду<br/>МКБ-10
                  </p>
                  <p className="usp-item-text">
                    Поддержка всех разделов<br/>и нозологий.
                  </p>
                </div>
                <div className="usp-item">
                  <p className="item-title usp-item-title">
                    Клинические рекомендации<br/>2024 и 2025 годов в работе
                  </p>
                  <p className="usp-item-text">
                    Все документы с пометкой<br/>об утверждении и датой.
                  </p>
                </div>
              </div>
              <div className="line-2">
                <div className="usp-item">
                  <p className="item-title usp-item-title">
                    Утверждённые Минздравом<br/>РФ рекомендации
                  </p>
                  <p className="usp-item-text">
                    Только официальные данные.<br/>Обновляются в режиме реального<br/>времени
                  </p>
                </div>
                <div className="usp-item">
                  <p className="item-title usp-item-title">
                    Рубрикатор клинических<br/>рекомендаций
                  </p>
                  <p className="usp-item-text">
                    Удобная навигация по темам:<br/>кардиология, гастроэнтерология,<br/>педиатрия и пр.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="clients" className="clients-section">
          <div className="clients-container">
            <h2 className="title">
              <span className="highlight">Кому</span> и <span className="highlight">зачем</span> нужен наш справочник?
            </h2>
            <div className="clients-list">

              <div className="clients-item">
                <p className="item-title clients-item-title">
                  Врачам
                </p>
                <div className="vertical-line"></div>
                <p className="item-text">
                  <span className="highlight">✓</span> Быстрый доступ к протоколам Минздрава РФ<br/>
                  <span className="highlight">✓</span> Поддержка при диагностике, выборе лечения, оформлении
                  документации<br/>
                  <span className="highlight">✓</span> Экономия времени и минимизация ошибок
                </p>
              </div>

              <div className="clients-item">
                <p className="item-title clients-item-title">
                  Руководителям<br/>клиник
                </p>
                <div className="vertical-line"></div>
                <p className="item-text">
                  <span className="highlight">✓</span> Контроль соответствия клинрекам и стандартам<br/>
                  <span className="highlight">✓</span> Помощь при проверках страховых, Росздравнадзора<br/>
                  <span className="highlight">✓</span> Повышение качества медицинской помощи
                </p>
              </div>

              <div className="clients-item">
                <p className="item-title clients-item-title">
                  Студентам и<br/>ординаторам
                </p>
                <div className="vertical-line"></div>
                <p className="item-text">
                  <span className="highlight">✓</span> Понимание структуры клинрека с первых курсов<br/>
                  <span className="highlight">✓</span> Подготовка к экзаменам и практикам<br/>
                  <span className="highlight">✓</span> Уверенность в действиях при работе с пациентами
                </p>
              </div>

            </div>
          </div>
        </section>
        <section id="pricing" className="pricing-section">
          <div className="pricing-container">
            <h2 className="title">
              Тарифы и <span className="highlight">цены</span>
            </h2>

            <div className="pricing-mobile">
              <div className="pricing-item">
                <p className="pricing-item-title">
                  Базовый
                </p>
                <div className="pricing-conditions">
                  <div className="duration">
                    1 месяц
                  </div>
                  <div className="price">
                    300 руб.
                  </div>
                </div>
                {/*<form action="#" method="POST">*/}
                {/*  <input type="hidden" name="tariff" value="base"/>*/}
                {/*  <button type="submit" className="btn-select" aria-label="Выбрать тариф Базовый">Выбрать тариф</button>*/}
                {/*</form>*/}
                <Link
                    href="/login"
                    className="btn-select"
                    aria-label="Выбрать тариф Базовый"
                >
                  Выбрать тариф
                </Link>
              </div>
              <div className="pricing-item bg-blue">
                <p className="pricing-item-title">
                  Оптимальный
                </p>
                <div className="pricing-conditions">
                  <div className="duration">
                    3 месяца
                  </div>
                  <div className="price">
                    750 руб.
                  </div>
                </div>
                <Link
                    href="/login"
                    className="btn-select"
                    aria-label="Выбрать тариф Базовый"
                >
                  Выбрать тариф
                </Link>
              </div>
              <div className="pricing-item">
                <p className="pricing-item-title">
                  Расширенный
                </p>
                <div className="pricing-conditions">
                  <div className="duration">
                    6 месяцев
                  </div>
                  <div className="price">
                    1200 руб.
                  </div>
                </div>
                <Link
                    href="/login"
                    className="btn-select"
                    aria-label="Выбрать тариф Базовый"
                >
                  Выбрать тариф
                </Link>
              </div>
              <div className="pricing-item bg-blue">
                <p className="pricing-item-title">
                  Премиум
                </p>
                <div className="pricing-conditions">
                  <div className="duration">
                    12 месяцев
                  </div>
                  <div className="price">
                    1800 руб.
                  </div>
                </div>
                <Link
                    href="/login"
                    className="btn-select"
                    aria-label="Выбрать тариф Базовый"
                >
                  Выбрать тариф
                </Link>
              </div>
            </div>
            <table className="pricing-table">
              <thead>
              <tr className="table-bg">
                <th>Тариф</th>
                <th>Срок</th>
                <th>Цена</th>
                <th>Экономия</th>
                <th></th>
              </tr>
              </thead>
              <tbody>
              <tr>
                <td>Базовый</td>
                <td>1 месяц</td>
                <td>300 ₽</td>
                <td>—</td>
                <td>
                  <Link
                      href="/login"
                      className="btn-select"
                      aria-label="Выбрать тариф Базовый"
                  >
                    Выбрать тариф
                  </Link>
                </td>
              </tr>
              <tr className="table-bg">
                <td>Оптимальный</td>
                <td>3 месяца</td>
                <td>750 ₽</td>
                <td>–150 ₽</td>
                <td>
                  <Link
                      href="/login"
                      className="btn-select"
                      aria-label="Выбрать тариф Базовый"
                  >
                    Выбрать тариф
                  </Link>
                </td>
              </tr>
              <tr>
                <td>Расширенный</td>
                <td>6 месяцев</td>
                <td>1 200 ₽</td>
                <td>–600 ₽</td>
                <td>
                  <Link
                      href="/login"
                      className="btn-select"
                      aria-label="Выбрать тариф Базовый"
                  >
                    Выбрать тариф
                  </Link>
                </td>
              </tr>
              <tr className="table-bg">
                <td>Премиум</td>
                <td>12 месяцев</td>
                <td>1 800 ₽</td>
                <td>–1 800 ₽</td>
                <td>
                  <Link
                      href="/login"
                      className="btn-select"
                      aria-label="Выбрать тариф Базовый"
                  >
                    Выбрать тариф
                  </Link>
                </td>
              </tr>
              </tbody>
            </table>
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
                  answer="Да, автосписание можно отключить в личном кабинете в разделе «Тарифы» доступна кнопка «Отписаться»."
              />

              <FaqItem
                  question="Как оформить подписку на сайт?"
                  answer="Перейдите в раздел «Тарифы», выберите нужный вариант и нажмите кнопку «Оплатить тариф». После оплаты вы получите мгновенный доступ ко всем материалам. Дата окончания подписки будет отображаться в личном кабинете."
              />

              <FaqItem
                  question="Что будет включать подписка на сайт?"
                  answer={
                    <>
                      <p>Подписка открывает доступ к:</p>
                      <ul>
                        <li><span className="highlight">✓</span> Всем актуальным клиническим рекомендациям</li>
                        <li><span className="highlight">✓</span> Ежемесячным обновлениям и новым публикациям</li>
                      </ul>
                    </>
                  }
              />

              <FaqItem
                  question="На основе каких источников представлена информация?"
                  answer={
                    <>
                      Мы создаём сокращённые клинреки на основе официальных клинических рекомендаций Минздрава РФ (
                      <Link className="minzdrav-link"
                          href="https://cr.minzdrav.gov.ru"
                          target="_blank"
                          rel="noopener noreferrer"
                      >
                        сайт Минздрава РФ
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
                      Однако полный доступ ко всем клиническим рекомендациям и функциям требует подписки.
                    </>
                  }
              />

              <FaqItem
                  question="Куда писать, если возникли технические проблемы?"
                  answer={
                    <>
                      <p>Свяжитесь с нами — мы поможем в ближайшее время:</p>
                      <ul>
                        <li><strong>Email: </strong><Link href="mailto:info@easymed.pro">info@easymed.pro</Link></li>
                        <li><strong>Telegram: </strong><Link
                            href="https://t.me/easymed_support"
                            target="_blank"
                            rel="noopener noreferrer"
                        >@easymed_support</Link></li>
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
        <section className="video-section" id="video">
          <div className="video-container">
            <h2>
              Видео-<span className="highlight">инструкция</span>
            </h2>
            <div className="video">
              <iframe width="720" height="405"
                      src="https://dzen.ru/embed/oo0aWh_8IAAA?from_block=partner&from=zen&mute=0&autoplay=0&tv=0"
                      allow="autoplay; fullscreen; accelerometer; gyroscope; picture-in-picture; encrypted-media"
                      data-testid="embed-iframe" frameBorder="0" scrolling="no" allowFullScreen></iframe>
            </div>
          </div>
        </section>
        <section id="why-us" className="why-us-section">
          <div className="why-us-container">
            <h2 className="title why-us-title">
              Почему сайт <span className="highlight"><Link href="#" className="why-us-btn">klinicheskie-rekomendatsii.ru</Link></span> —
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
              <span className="highlight"><Link href="#" className="why-us-btn">klinicheskie-rekomendatsii.ru</Link></span> - ваш надёжный
              справочник
            </h2>
          </div>
        </section>
      </main>
      </>
  );
}

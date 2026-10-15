import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import styles from "./page.module.css";
import ApiHeroActions from "./ApiHeroActions";
import ApiHeroCards from "./ApiHeroCards";
import ApiDepthReveal from "./ApiDepthReveal";
import ApiScrollAnimations from "./ApiScrollAnimations";
import audienceIcon from "@/assets/images/api-page/main-icon.png";
import dataIcon1 from "@/assets/images/api-page/data-icon-1.png";
import dataIcon2 from "@/assets/images/api-page/data-icon-2.png";
import dataIcon3 from "@/assets/images/api-page/data-icon-3.png";
import dataIcon4 from "@/assets/images/api-page/data-icon-4.png";
import dataIcon5 from "@/assets/images/api-page/data-icon-5.png";
import dataIcon6 from "@/assets/images/api-page/data-icon-6.png";
import dataIcon7 from "@/assets/images/api-page/data-icon-7.png";
import dataIcon8 from "@/assets/images/api-page/data-icon-8.png";
import dataIcon9 from "@/assets/images/api-page/data-icon-9.png";
import eagleLogo from "@/assets/images/api-page/eagle.png";
import starLogo from "@/assets/images/api-page/star.png";
import attentionIcon from "@/assets/images/api-page/attention.png";
import depthDiagnosisIcon from "@/assets/images/api-page/depth1.png";
import depthDiagnosticsIcon from "@/assets/images/api-page/depth2.png";
import depthTreatmentIcon from "@/assets/images/api-page/depth3.png";
import depthServicesIcon from "@/assets/images/api-page/depth4.png";
import depthDrugsIcon from "@/assets/images/api-page/depth5.png";
import apiResponseImage from "@/assets/images/api-page/api-img.png";
import moduleMisIcon from "@/assets/images/api-page/api-icon-1.png";
import moduleContextIcon from "@/assets/images/api-page/api-icon-2.png";
import moduleEasyMedIcon from "@/assets/images/api-page/api-icon-3.png";
import moduleRecommendationsIcon from "@/assets/images/api-page/api-icon-4.png";
import moduleDoctorIcon from "@/assets/images/api-page/api-icon-5.png";
import integrationIconApi from "@/assets/images/api-page/integration-icon-1.png";
import integrationIconModules from "@/assets/images/api-page/integration-icon-2.png";

export const metadata: Metadata = {
  title: "API и модули — EasyMed",
  description:
    "API, структурированные медицинские данные и готовые модули для интеграции в медицинские информационные системы.",
};

const dataCards: ReadonlyArray<{
  title: string;
  description: string;
  icon: StaticImageData;
}> = [
  {
    title: "Клинические рекомендации",
    description:
      "Структурированные данные с привязкой к диагнозам, вмешательствам и другим медицинским сущностям.",
    icon: dataIcon1,
  },
  {
    title: "Диагностика",
    description:
      "Диагностические назначения, исследования и связанные с ними параметры.",
    icon: dataIcon2,
  },
  {
    title: "Лечение",
    description:
      "Лечебные назначения и медицинские вмешательства, предусмотренные клиническими рекомендациями.",
    icon: dataIcon3,
  },
  {
    title: "Лекарственные препараты",
    description: "Препараты, схемы и связанные с ними параметры.",
    icon: dataIcon4,
  },
  {
    title: "Параметры назначения",
    description: "Дозировка, курс, схема, условия применения.",
    icon: dataIcon5,
  },
  {
    title: "Условия и обязательства",
    description: "Необходимость назначения, тип назначения и другие условия.",
    icon: dataIcon6,
  },
  {
    title: "Приём пациента",
    description: "Информация о типе приёма (первичный / повторный).",
    icon: dataIcon7,
  },
  {
    title: "Возраст",
    description: "Возрастные ограничения и условия применения.",
    icon: dataIcon8,
  },
  {
    title: "Критерии качества",
    description:
      "Данные о наличии услуги в таблицах критериев качества КР.",
    icon: dataIcon9,
  },
];

const depthEntities: ReadonlyArray<{
  lines: readonly [string, string];
  icon: StaticImageData;
  width: number;
  height: number;
}> = [
  {
    lines: ["Диагностические", "назначения"],
    icon: depthDiagnosticsIcon,
    width: 23,
    height: 28,
  },
  {
    lines: ["Лечебные", "назначения"],
    icon: depthTreatmentIcon,
    width: 22,
    height: 27,
  },
  {
    lines: ["Медицинские", "услуги"],
    icon: depthServicesIcon,
    width: 31,
    height: 24,
  },
  {
    lines: ["Лекарственные", "препараты"],
    icon: depthDrugsIcon,
    width: 27,
    height: 27,
  },
];

const depthParams: ReadonlyArray<readonly [string, string?]> = [
  ["Дозировка"],
  ["Курс"],
  ["Схема", "применения"],
  ["Возраст"],
  ["Условия", "назначения"],
];

/* Coordinates in the 639×251 scheme box; len is the path length in px. */
const depthLinksIn = [
  { d: "M131 126H155A17 17 0 0 0 172 109V46.5A17 17 0 0 1 189 29.5H218", len: 169 },
  { d: "M131 126H155.75A16.25 16.25 0 0 0 172 109.75A16.25 16.25 0 0 1 188.25 93.5H218", len: 106 },
  { d: "M131 126H156.25A15.75 15.75 0 0 1 172 141.75A15.75 15.75 0 0 0 187.75 157.5H218", len: 105 },
  { d: "M131 126H155A17 17 0 0 1 172 143V204.5A17 17 0 0 0 189 221.5H218", len: 168 },
] as const;

const depthLinksOut = [
  { d: "M406 29.5H436A17 17 0 0 1 453 46.5V109A17 17 0 0 0 470 126H493", len: 169 },
  { d: "M406 93.5H436.75A16.25 16.25 0 0 1 453 109.75A16.25 16.25 0 0 0 469.25 126H493", len: 106 },
  { d: "M406 157.5H437.25A15.75 15.75 0 0 0 453 141.75A15.75 15.75 0 0 1 468.75 126H493", len: 105 },
  { d: "M406 221.5H436A17 17 0 0 0 453 204.5V143A17 17 0 0 1 470 126H493", len: 168 },
] as const;

/* Mobile rail in a 40×373 box, matching the stacked card layout. */
const depthLinksMobile = [
  { d: "M16 63V105.5A12 12 0 0 0 28 117.5H41", len: 75 },
  { d: "M16 63V172.5A12 12 0 0 0 28 184.5H41", len: 142 },
  { d: "M16 63V239.5A12 12 0 0 0 28 251.5H41", len: 209 },
  { d: "M16 63V306.5A12 12 0 0 0 28 318.5H41", len: 276 },
  { d: "M16 63V373", len: 310 },
] as const;

const lenStyle = (len: number) => ({ "--len": len }) as CSSProperties;

const apiFeatures = [
  "Интеграция структурированных данных.",
  "Получение данных в машиночитаемом формате.",
  "Использование связей между медсущностями.",
  "Актуализированные данные.",
] as const;

const moduleSteps: ReadonlyArray<{
  lines: readonly [string, string?];
  icon: StaticImageData;
  width: number;
  height: number;
}> = [
  { lines: ["МИС"], icon: moduleMisIcon, width: 23, height: 21 },
  {
    lines: ["Выбор диагноза", "и контекста"],
    icon: moduleContextIcon,
    width: 21,
    height: 21,
  },
  {
    lines: ["Готовый модуль", "EasyMed"],
    icon: moduleEasyMedIcon,
    width: 24,
    height: 20,
  },
  {
    lines: ["Рекомендации", "и назначения"],
    icon: moduleRecommendationsIcon,
    width: 19,
    height: 22,
  },
  {
    lines: ["Рабочее место", "врача"],
    icon: moduleDoctorIcon,
    width: 22,
    height: 24,
  },
];

export default function ApiPage() {
  return (
    <>
      <ApiScrollAnimations />
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
          <div className={styles.visual} aria-hidden="true">
            <ApiHeroCards />
          </div>
        </div>
      </section>

      <section
        className={styles.dataSection}
        aria-labelledby="api-data-title"
        id="data"
      >
        <div className={styles.dataInner}>
          <div className={styles.dataIntro}>
            <p className={styles.dataEyebrow}>Что входит в данные EasyMed</p>
            <h2 className={styles.dataTitle} id="api-data-title">
              Больше, чем просто
              <br />
              текст клинических рекомендаций
            </h2>
            <p className={styles.dataLead}>
              Мы структурируем клинические рекомендации и связанные с ними
              медицинские данные, чтобы их можно было использовать
              непосредственно в информационных системах.
            </p>
          </div>

          <ul className={styles.dataCards}>
            {dataCards.map((card) => (
              <li key={card.title} className={styles.dataCard}>
                <span className={styles.dataCardIcon} aria-hidden="true">
                  <Image
                    className={styles.dataCardIconImage}
                    src={card.icon}
                    alt=""
                    width={24}
                    height={24}
                  />
                </span>
                <div className={styles.dataCardBody}>
                  <h3 className={styles.dataCardTitle}>{card.title}</h3>
                  <p className={styles.dataCardDescription}>
                    {card.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={styles.sourcesSection}
        aria-labelledby="api-sources-title"
      >
        <div className={styles.sourcesInner}>
          <div className={styles.sourcesIntro}>
            <p className={styles.sourcesBadge}>Источники данных</p>
            <h2 className={styles.sourcesTitle} id="api-sources-title">
              Данные из клинических рекомендаций{" "}
              <br className={styles.desktopBreak} />
              разных профессиональных источников
            </h2>
            <p className={styles.sourcesLead}>
              Основу данных EasyMed составляют структурированные клинические
              рекомендации<br className={styles.desktopBreak} /> Министерства
              здравоохранения РФ. Также мы работаем с клиническими
              <br className={styles.desktopBreak} /> рекомендациями,
              разработанными Ассоциацией стоматологов России.
            </p>
          </div>

          <div className={styles.sourcesAside}>
            <ul className={styles.sourcesCards}>
              <li className={styles.sourcesCard}>
                <span className={styles.sourcesCardLogo}>
                  <Image src={eagleLogo} alt="" width={44} height={44} />
                </span>
                <div className={styles.sourcesCardBody}>
                  <h3 className={styles.sourcesCardTitle}>Минздрав России</h3>
                  <p className={styles.sourcesCardDescription}>
                    Клинические рекомендации
                  </p>
                </div>
              </li>
              <li className={styles.sourcesCard}>
                <span className={styles.sourcesCardLogo}>
                  <Image src={starLogo} alt="" width={36} height={34} />
                </span>
                <div className={styles.sourcesCardBody}>
                  <h3 className={styles.sourcesCardTitle}>
                    Ассоциация стоматологов России
                  </h3>
                  <p className={styles.sourcesCardDescription}>
                    Клинические рекомендации
                    <br />
                    по стоматологии
                  </p>
                </div>
              </li>
            </ul>
            <p className={styles.sourcesNote}>
              <Image
                className={styles.sourcesNoteIcon}
                src={attentionIcon}
                alt=""
                width={23}
                height={22}
              />
              <span>
                Источник и состав данных указываются для соответствующих
                наборов и разделов.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section
        className={styles.depthSection}
        aria-labelledby="api-depth-title"
      >
        <div className={styles.depthInner}>
          <div className={styles.depthIntro}>
            <p className={styles.depthBadge}>Глубина структурирования</p>
            <h2 className={styles.depthTitle} id="api-depth-title">
              От документа к данным,
              <br />
              которые понимает ваша система
            </h2>
            <p className={styles.depthLead}>
              <strong>Клиническая рекомендация</strong> для EasyMed - это не
              только текст <br className={styles.desktopBreak} />
              документа. Мы структурируем связанные между собой медицинские{" "}
              <br className={styles.desktopBreak} />
              <strong>сущности, их свойства и условия применения</strong>.
            </p>
          </div>

          <div className={styles.depthAside}>
            <div className={styles.depthVisual}>
              <ApiDepthReveal className={styles.depthScheme}>
                <svg
                  className={styles.depthLines}
                  viewBox="0 0 639 251"
                  aria-hidden="true"
                  focusable="false"
                >
                  <g>
                    {depthLinksIn.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthLine} ${styles.depthLineIn}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                    {depthLinksOut.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthLine} ${styles.depthLineOut}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                  </g>
                  <g className={`${styles.depthPulses} ${styles.depthPulsesIn}`}>
                    {depthLinksIn.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthPulse} ${styles.depthPulseIn}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                  </g>
                  <g className={`${styles.depthPulses} ${styles.depthPulsesOut}`}>
                    {depthLinksOut.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthPulse} ${styles.depthPulseOut}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                  </g>
                </svg>

                <svg
                  className={styles.depthLinesMobile}
                  viewBox="0 0 40 373"
                  aria-hidden="true"
                  focusable="false"
                >
                  <g>
                    {depthLinksMobile.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthLine} ${styles.depthLineMobile}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                  </g>
                  <g
                    className={`${styles.depthPulses} ${styles.depthPulsesMobile}`}
                  >
                    {depthLinksMobile.map((link) => (
                      <path
                        key={link.d}
                        className={`${styles.depthPulse} ${styles.depthPulseMobile}`}
                        d={link.d}
                        style={lenStyle(link.len)}
                      />
                    ))}
                  </g>
                </svg>

                <div className={`${styles.depthNode} ${styles.depthDiagnosis}`}>
                  <span className={styles.depthIcon} aria-hidden="true">
                    <Image src={depthDiagnosisIcon} alt="" width={28} height={27} />
                  </span>
                  <span className={styles.depthNodeText}>Диагноз</span>
                </div>

                <ul className={styles.depthEntities}>
                  {depthEntities.map((entity, index) => (
                    <li
                      key={entity.lines[0]}
                      className={`${styles.depthNode} ${styles.depthEntity}`}
                      style={{ "--index": index } as CSSProperties}
                    >
                      <span className={styles.depthIcon} aria-hidden="true">
                        <Image
                          src={entity.icon}
                          alt=""
                          width={entity.width}
                          height={entity.height}
                        />
                      </span>
                      <span className={styles.depthNodeText}>
                        {entity.lines[0]}
                        <br className={styles.depthBreak} /> {entity.lines[1]}
                      </span>
                    </li>
                  ))}
                </ul>

                <ul className={`${styles.depthNode} ${styles.depthParams}`}>
                  {depthParams.map(([first, second]) => (
                    <li key={first} className={styles.depthParam}>
                      <svg
                        className={styles.depthArrow}
                        viewBox="0 0 17 8.2"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M0 3.27H14.53L13.02 1.81V0L16.93 4.05V4.1L13.02 8.15V6.35L14.5 4.91H0V3.27Z" />
                      </svg>
                      <span className={styles.depthNodeText}>
                        {first}
                        {second ? (
                          <>
                            <br className={styles.depthBreak} /> {second}
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </ApiDepthReveal>

              <p className={styles.depthNote}>
                Такая структура позволяет использовать клинические данные не
                только для чтения, <br className={styles.desktopBreak} />
                но и для построения цифровых медицинских сценариев.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.modulesSection} aria-label="API и готовые модули">
        <div className={styles.modulesFrame}>
          <article
            className={`${styles.modulesCard} ${styles.modulesApi}`}
            aria-labelledby="api-modules-api-title"
          >
            <div className={styles.modulesApiText}>
              <p className={styles.modulesBadge}>API</p>
              <h2 className={styles.modulesTitle} id="api-modules-api-title">
                Подключайте данные EasyMed
                <br className={styles.desktopBreak} /> к своей системе
              </h2>
              <p className={styles.modulesLead}>
                API позволяет получать структурированные медицинские данные
                и использовать их непосредственно в вашей информационной
                системе. Вы можете самостоятельно определить, как эти данные
                будут использоваться в интерфейсе и рабочих процессах.
              </p>
              <h3 className={styles.modulesListTitle}>Для разработчиков</h3>
              <ul className={styles.modulesList}>
                {apiFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className={styles.modulesApiVisual}>
              <Image
                className={styles.modulesApiImage}
                src={apiResponseImage}
                alt="Пример ответа API в формате JSON"
                width={247}
                height={236}
              />
              <ApiHeroActions variant="integration" />
            </div>
          </article>

          <article
            className={`${styles.modulesCard} ${styles.modulesReady}`}
            aria-labelledby="api-modules-ready-title"
          >
            <p className={styles.modulesBadge}>Готовые модули</p>
            <h2 className={styles.modulesTitle} id="api-modules-ready-title">
              Не разрабатывайте клинический
              <br className={styles.desktopBreak} /> сценарий с нуля
            </h2>
            <p className={styles.modulesLead}>
              Используйте готовые модули EasyMed, которые уже используют
              структурированные клинические данные. Готовый модуль позволяет
              быстрее встроить конкретный медицинский сценарий в существующую
              информационную систему.
            </p>

            <ol className={styles.modulesFlow}>
              {moduleSteps.map((step, index) => (
                <li key={step.lines[0]} className={styles.modulesStep}>
                  <div className={styles.modulesStepBody}>
                    <span className={styles.modulesStepIcon} aria-hidden="true">
                      <Image
                        src={step.icon}
                        alt=""
                        width={step.width}
                        height={step.height}
                      />
                    </span>
                    <span className={styles.modulesStepLabel}>
                      {step.lines[0]}
                      {step.lines[1] ? (
                        <>
                          <br className={styles.modulesStepBreak} />{" "}
                          {step.lines[1]}
                        </>
                      ) : null}
                    </span>
                  </div>
                  {index < moduleSteps.length - 1 ? (
                    <svg
                      className={styles.modulesFlowArrow}
                      viewBox="0 0 17 8.2"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M0 3.27H14.53L13.02 1.81V0L16.93 4.05V4.1L13.02 8.15V6.35L14.5 4.91H0V3.27Z" />
                    </svg>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className={styles.modulesNote}>
              <Image
                className={styles.modulesNoteIcon}
                src={attentionIcon}
                alt=""
                width={23}
                height={22}
              />
              <p className={styles.modulesNoteText}>
                EasyMed может выступать не только источником данных,
                но и поставщиком готовой клинической логики для конкретных
                рабочих сценариев.
              </p>
              <button type="button" className={styles.modulesNoteButton} disabled>
                Подробнее о модуле <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        className={styles.integrationSection}
        aria-labelledby="api-integration-title"
      >
        <div className={styles.integrationInner}>
          <div className={styles.integrationIntro}>
            <p className={styles.integrationBadge}>Интеграция</p>
            <h2 className={styles.integrationTitle} id="api-integration-title">
              API или готовый модуль
            </h2>
            <p className={styles.integrationLead}>
              Выберите подходящий способ интеграции
            </p>
          </div>

          <div className={styles.integrationAside}>
            <div className={styles.integrationCards}>
              <article
                className={styles.integrationCard}
                aria-labelledby="api-integration-api-title"
              >
                <span className={styles.integrationCardIcon} aria-hidden="true">
                  <Image
                    src={integrationIconApi}
                    alt=""
                    width={30}
                    height={22}
                  />
                </span>
                <div className={styles.integrationCardBody}>
                  <h3
                    className={styles.integrationCardTitle}
                    id="api-integration-api-title"
                  >
                    API
                  </h3>
                  <p className={styles.integrationCardDescription}>
                    Для команд, которые хотят самостоятельно использовать данные
                    EasyMed и создавать собственные интерфейсы и сценарии.
                  </p>
                  <p className={styles.integrationCardScheme}>
                    Получить данные → Разработать сценарий → Встроить в систему
                  </p>
                </div>
              </article>

              <article
                className={styles.integrationCard}
                aria-labelledby="api-integration-modules-title"
              >
                <span className={styles.integrationCardIcon} aria-hidden="true">
                  <Image
                    src={integrationIconModules}
                    alt=""
                    width={35}
                    height={29}
                  />
                </span>
                <div className={styles.integrationCardBody}>
                  <h3
                    className={styles.integrationCardTitle}
                    id="api-integration-modules-title"
                  >
                    Готовые модули
                  </h3>
                  <p className={styles.integrationCardDescription}>
                    Для тех, кому нужен готовый медицинский сценарий без
                    необходимости самостоятельно разрабатывать его с нуля.
                  </p>
                  <p className={styles.integrationCardScheme}>
                    Подключить модуль → Настроить интеграцию → Использовать в
                    системе
                  </p>
                </div>
              </article>
            </div>

            <p className={styles.integrationNote}>
              В обоих случаях основой являются структурированные{" "}
              <span className={styles.integrationNoteAccent}>
                медицинские данные EasyMed
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      <section className={styles.startSection} aria-labelledby="api-start-title">
        <div className={styles.startInner}>
          <div className={styles.startBanner}>
            <div className={styles.startCopy}>
              <p className={styles.startBadge}>Готовы начать?</p>
              <h2 className={styles.startTitle} id="api-start-title">
                Интегрируйте клинические данные
                <br />
                EasyMed в свою систему
              </h2>
            </div>

            <div className={styles.startAside}>
              <p className={styles.startDescription}>
                Расскажите, какую медицинскую систему или цифровой продукт вы
                развиваете. Мы обсудим подходящий формат интеграции - API или
                готовый модуль.
              </p>
              <ApiHeroActions variant="start" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

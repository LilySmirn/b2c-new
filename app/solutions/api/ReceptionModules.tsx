"use client";

import { useLayoutEffect, useRef, useState } from "react";
import CorporateContactPopup from "@/app/components/CorporateContactPopup";
import styles from "./ReceptionModules.module.css";

type ModuleId = "clinical" | "ai" | "ix";

type ModuleCard = {
  id: ModuleId;
  title: string;
  text: string;
  tab: readonly [string, string?];
};

const modules: readonly ModuleCard[] = [
  {
    id: "clinical",
    title: "Клинические рекомендации",
    text: "По коду МКБ, типу приёма и возрасту. В дневник уходит назначение: препарат, доза, форма, схема и курс.",
    tab: ["Клинические", "рекомендации"],
  },
  {
    id: "ai",
    title: "EasyMed AI",
    text: "Вопрос по случаю — там же, где идёт приём. Подсказку можно сразу добавить в назначения.",
    tab: ["EasyMed AI"],
  },
  {
    id: "ix",
    title: "Проверка взаимодействий",
    text: "До записи в карту: что нельзя сочетать и где нужна осторожность. Врач правит схему на месте.",
    tab: ["Проверка", "взаимодействий"],
  },
];

const clinicalSections = [
  "Диагностика обследования",
  "Диагностика по показаниям",
  "Лечение",
  "Препараты",
  "Шкалы и опросники",
] as const;

const drugs: ReadonlyArray<{
  id: string;
  name: string;
  code: string;
  dose: string;
  form: string;
  selected: boolean;
  pending: boolean;
}> = [
  {
    id: "ppi",
    name: "Ингибиторы протонного насоса",
    code: "A1",
    dose: "40 мг",
    form: "Капсулы",
    selected: false,
    pending: false,
  },
  {
    id: "h2",
    name: "Блокаторы H2-гистаминовых рецепторов",
    code: "C5",
    dose: "Доза",
    form: "Форма",
    selected: false,
    pending: true,
  },
  {
    id: "rebamipide-1",
    name: "Ребамипид",
    code: "A1",
    dose: "Доза",
    form: "Форма",
    selected: true,
    pending: true,
  },
  {
    id: "rebamipide-2",
    name: "Ребамипид",
    code: "A1",
    dose: "Доза",
    form: "Форма",
    selected: true,
    pending: true,
  },
  {
    id: "clarithromycin",
    name: "Кларитромицин",
    code: "A1",
    dose: "500 мг 2 раза",
    form: "14 дней",
    selected: false,
    pending: false,
  },
];

const interactions: ReadonlyArray<{
  tone: "bad" | "ok";
  label: string;
  title: string;
  text: string;
}> = [
  {
    tone: "bad",
    label: "Нельзя",
    title: "Ребамипид + Тетрациклин",
    text: "Совместный приём может снизить всасывание тетрациклина. Сочетание не рекомендуется.",
  },
  {
    tone: "bad",
    label: "Нельзя",
    title: "Висмута трикалия дицитрат + Тетрациклин",
    text: "Висмут снижает всасывание тетрациклина. Одновременный приём внутрь не рекомендуется.",
  },
  {
    tone: "bad",
    label: "Нельзя",
    title: "Кларитромицин + Симвастатин",
    text: "Макролид может резко повысить концентрацию симвастатина. Сочетание противопоказано.",
  },
  {
    tone: "ok",
    label: "Можно",
    title: "Омепразол + Амоксициллин",
    text: "Клинически значимого нежелательного взаимодействия для этой пары не отмечено.",
  },
];

const railItems: readonly ModuleId[] = ["clinical", "ai", "ix"];

// Same distances and duration as ApiScrollAnimations.
const REVEAL_DURATION_MS = 1150;
const REVEAL_STAGGER_MS = 161;

function statusText(active: ModuleId | null) {
  if (!active) return "Выберите модуль — или соберите все три в надстройку.";
  const title = modules.find((module) => module.id === active)?.title ?? "";
  return `Модуль «${title}» подключён отдельно. Остальные можно добавить позже.`;
}

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3.5h7l5 5V20.5H7v-17Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 3.5v5h5M9.5 13h6M9.5 16.5h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconAi() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6" y="8" width="12" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8V5.2M9.2 13h.01M14.8 13h.01M9.2 16.2h5.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.5 19 6.2v5.4c0 4-2.8 6.7-7 8.4-4.2-1.7-7-4.4-7-8.4V6.2L12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12.1 11 14.1 15.2 9.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="4.5" y="4.5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="4.5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4.5" y="13.5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13.5" y="13.5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.8 15.8 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconExpand() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3.2 6.2V3.2H6.2M9.8 3.2h3v3M12.8 9.8v3h-3M6.2 12.8h-3v-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.8 4.4 6 7.6 9.2 4.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModuleGlyph({ id }: { id: ModuleId }) {
  if (id === "clinical") return <IconFile />;
  if (id === "ai") return <IconAi />;
  return <IconShield />;
}

function FakeCheck({ on }: { on: boolean }) {
  return (
    <span className={on ? `${styles.check} ${styles.checkOn}` : styles.check} aria-hidden="true">
      {on ? (
        <svg viewBox="0 0 12 12">
          <path d="M2.4 6.2 4.7 8.5 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </span>
  );
}

function FakeSelect({ value, muted }: { value: string; muted?: boolean }) {
  return (
    <span className={muted ? `${styles.select} ${styles.selectMuted}` : styles.select}>
      <span>{value}</span>
      <Chevron />
    </span>
  );
}

function EmptyPane() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        <span className={styles.emptyCard}>
          <i />
          <i />
        </span>
        <span className={styles.emptyCardSmall}>
          <i />
          <i />
        </span>
        <svg className={styles.emptyCursor} viewBox="0 0 18 18">
          <path d="M3.2 1.8 15.2 8.6 9.2 9.8 7.4 15.6Z" fill="#2f6bff" />
        </svg>
      </div>
      <h3 className={styles.emptyTitle}>Панель</h3>
      <p className={styles.emptyText}>
        Выберите хотя бы один модуль — панель соберётся из него.
      </p>
    </div>
  );
}

function ClinicalPane() {
  return (
    <div className={styles.clinical}>
      <div className={styles.field}>
        <IconSearch />
        <span>Код МКБ, например K25</span>
      </div>
      <div className={styles.subnav} aria-hidden="true">
        {clinicalSections.map((section) => (
          <span
            key={section}
            className={section === "Препараты" ? `${styles.subnavItem} ${styles.subnavItemOn}` : styles.subnavItem}
          >
            {section}
          </span>
        ))}
      </div>
      <ul className={styles.drugs}>
        {drugs.map((drug) => (
          <li
            key={drug.id}
            className={drug.selected ? `${styles.drug} ${styles.drugOn}` : styles.drug}
          >
            <FakeCheck on={drug.selected} />
            <span className={styles.kk}>КК</span>
            <span className={styles.drugCode}>{drug.code}</span>
            <span className={styles.drugName}>{drug.name}</span>
            <FakeSelect value={drug.dose} muted={drug.pending} />
            <FakeSelect value={drug.form} muted={drug.pending} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AiPane() {
  return (
    <div className={styles.ai}>
      <div className={styles.aiHead}>
        <span className={styles.aiAvatar} aria-hidden="true">
          <IconAi />
        </span>
        <span>
          <span className={styles.aiName}>EasyMed AI</span>
          <span className={styles.aiRole}>ИИ-ассистент</span>
        </span>
      </div>
      <p className={styles.bubbleAi}>
        Привет! Я ваш AI-помощник. Могу помочь с анализом клинических данных, дать рекомендации, подсказать, что можно дополнительно проверить или что могло бы быть упущено в назначениях.
      </p>
      <div className={styles.chips}>
        <span>Что я могу сделать?</span>
        <span>Что мне нужно спросить?</span>
        <span>Какие назначения я пропустил?</span>
      </div>
      <p className={styles.time}>14:32</p>
      <div className={styles.doctorLine}>
        <p className={styles.bubbleDoctor}>
          Проверь, не пропустил ли я что-то важное в назначениях для этого пациента. Укажи, что ещё можно добавить.
        </p>
        <span className={styles.userAvatar} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="9" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="M6.4 18.5a5.6 5.6 0 0 1 11.2 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <p className={styles.time}>14:34</p>
    </div>
  );
}

function InteractionsPane() {
  return (
    <div className={styles.ix}>
      <div className={styles.field}>
        <IconSearch />
        <span>Введите название препарата...</span>
      </div>
      <div className={styles.checkButton}>Проверить взаимодействия</div>
      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.statBad}`}>
          <strong>3</strong>
          <span>Нельзя</span>
        </div>
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <strong>0</strong>
          <span>С осторожностью</span>
        </div>
        <div className={`${styles.stat} ${styles.statOk}`}>
          <strong>1</strong>
          <span>Можно</span>
        </div>
      </div>
      <h3 className={styles.resultsTitle}>Результаты проверки</h3>
      <ul className={styles.results}>
        {interactions.map((item) => (
          <li
            key={item.title}
            className={item.tone === "bad" ? `${styles.result} ${styles.resultBad}` : `${styles.result} ${styles.resultOk}`}
          >
            <span className={styles.resultTag}>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantScreen({
  active,
  onToggle,
}: {
  active: ModuleId | null;
  onToggle: (id: ModuleId) => void;
}) {
  const workspaceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) workspace.scrollTop = 0;
  }, [active]);

  return (
    <div className={styles.screen}>
      <div className={styles.rail} aria-hidden="true">
        <span className={styles.initials}>AM</span>
        {railItems.map((id) => (
          <span
            key={id}
            className={active === id ? `${styles.railIcon} ${styles.railIconOn}` : styles.railIcon}
          >
            <ModuleGlyph id={id} />
          </span>
        ))}
        <span className={styles.railIcon}>
          <IconGrid />
        </span>
      </div>
      <div className={styles.screenMain}>
        <div className={styles.screenHead}>
          <h3 className={styles.screenTitle}>Помощник врача</h3>
          <span className={styles.windowActions} aria-hidden="true">
            <IconExpand />
            <IconClose />
          </span>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Модули помощника врача">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              role="tab"
              id={`reception-tab-${module.id}`}
              className={styles.tab}
              aria-selected={active === module.id}
              aria-controls="reception-workspace"
              onClick={() => onToggle(module.id)}
            >
              {module.id === "ai" ? <span className={styles.aiMark} aria-hidden="true" /> : null}
              <span>
                {module.tab[0]}
                {module.tab[1] ? (
                  <>
                    <br />
                    {module.tab[1]}
                  </>
                ) : null}
              </span>
            </button>
          ))}
        </div>
        <div
          ref={workspaceRef}
          className={styles.workspace}
          id="reception-workspace"
          role="tabpanel"
          aria-labelledby={active ? `reception-tab-${active}` : undefined}
          aria-label={active ? undefined : "Панель"}
        >
          <div
            key={active ?? "empty"}
            className={active === null ? `${styles.pane} ${styles.paneEmpty}` : styles.pane}
          >
            {active === null ? <EmptyPane /> : null}
            {active === "clinical" ? <ClinicalPane /> : null}
            {active === "ai" ? <AiPane /> : null}
            {active === "ix" ? <InteractionsPane /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceptionModules() {
  const sectionRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ModuleId | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const nodes = [headRef.current, layoutRef.current].filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    if (!section || nodes.length === 0) return;

    const show = () => {
      nodes.forEach((node) => {
        node.dataset.reveal = "done";
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      show();
      return;
    }

    const animations: Animation[] = [];
    let observer: IntersectionObserver | null = null;

    const reveal = () => {
      animations.forEach((animation) => animation.cancel());
      observer?.disconnect();
      show();
    };

    try {
      nodes.forEach((node, index) => {
        node.removeAttribute("data-reveal");
        const animation = node.animate(
          [
            {
              opacity: 0,
              transform:
                index === 0 ? "translate3d(-38px, 0, 0)" : "translate3d(0, 34px, 0)",
            },
            { opacity: 1, transform: "none" },
          ],
          {
            duration: REVEAL_DURATION_MS,
            delay: index * REVEAL_STAGGER_MS,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        );
        animation.pause();
        animation.onfinish = () => {
          node.dataset.reveal = "done";
          animation.cancel();
        };
        animations.push(animation);
      });

      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          try {
            animations.forEach((animation) => animation.play());
          } catch {
            reveal();
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -18%" },
      );
      observer.observe(section);
    } catch {
      reveal();
    }

    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  const toggle = (id: ModuleId) => {
    setActive((current) => (current === id ? null : id));
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="reception-modules-title"
    >
      <div className={styles.inner}>
        <div ref={headRef} className={styles.head}>
          <p className={styles.badge}>Модули для приёма</p>
          <h2 className={styles.title} id="reception-modules-title">
            Три модуля, которые усиливают МИС на приёме
          </h2>
          <p className={styles.lead}>
            Клинические рекомендации, EasyMed AI и проверка взаимодействий подключаются по одному. Все три — одна панель внутри вашей системы: врач не уходит из карты пациента.
          </p>
          <p className={styles.fine}>
            Подключение модуля или надстройки — без перестройки карты пациента.
          </p>
        </div>

        <div ref={layoutRef} className={styles.layout}>
          <div className={styles.column}>
            <div className={styles.cards} role="group" aria-label="Модули">
              {modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={styles.card}
                  aria-pressed={active === module.id}
                  onClick={() => toggle(module.id)}
                >
                  <span className={styles.cardIcon} aria-hidden="true">
                    <ModuleGlyph id={module.id} />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.kicker}>Модуль</span>
                    <strong>{module.title}</strong>
                    <span>{module.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => setPopupOpen(true)}
                aria-haspopup="dialog"
              >
                Собрать надстройку
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => setPopupOpen(true)}
                aria-haspopup="dialog"
              >
                Обсудить модули
              </button>
            </div>
            <p className={styles.status} aria-live="polite">
              {statusText(active)}
            </p>
          </div>
          <div className={styles.screenSlot}>
            <AssistantScreen active={active} onToggle={toggle} />
          </div>
        </div>
      </div>
      {popupOpen ? (
        <CorporateContactPopup onClose={() => setPopupOpen(false)} />
      ) : null}
    </section>
  );
}

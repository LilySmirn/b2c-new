# Миграция модуля «Препараты» (медикаменты) в Next.js

Документ для генерации кода и переноса **логики, визуала и стилей** части, связанной с медикаментами, в Next.js (App Router / React / TypeScript).

Исходник: папка `preparaty/` в репозитории дизайнера «Помошник врача». Стек исходника: **чистый HTML + CSS + JS без React/TS/npm**. Экран монтируется функцией `mountPreparaty`.

---

## 0. Что переносить (скоуп)

### Обязательно (ядро медикаментов)

| Область | Суть |
|---|---|
| Список препаратов | Строки вкладки «Препараты», виды `trade` / `alternatives` / `scheme` / `combo` / `plain` / `extra-drug` |
| Мультивыбор | Кнопка-чекбокс, несколько препаратов одновременно в корзине «Лечение» |
| Поля строки | Доза (ввод + ▾), Форма, Схема, Курс, комментарий-pill, кнопка `i` |
| Торговые наименования | Меню по клику на название (МНН → торговое из `trades.json`) |
| Карточка `i` | Модалка «Назначение + Справка», комбо-поля доза/форма, приём, курс, комментарий |
| Межлекарственные взаимодействия | Панель `preparaty__ix`, подсветка строк `is-ok` / `is-warn` / `is-block` |
| Схема / комбинация | Мастера на 3 слота / набор 3 ДВ (часть медикаментов) |
| Медикамент сверх КР | Добавление из корзины → строка `extra-drug` в списке + участие во взаимодействиях |

### Можно не переносить сразу (оболочка EasyMed)

- Шапка 85px, логотип, «Рубрикатор»
- Вкладки диагностики / лечения / шкал (`classicItems` из `shell-tabs.json`)
- Корзина целиком (шаблоны, «Запись в карту»), кроме группы «Лечение» для препаратов
- Услуги (`custom` → «Прочее»)

В Next.js оболочку можно оставить своей; **ядро — state препаратов + UI списка + info + interactions + trades/interactions data**.

---

## 1. Карта файлов исходника

```
preparaty/
├── markup.html          # Каркас DOM (слои модалок, data-role)
├── preview.html         # Превью: каталог #preparaty-catalog + подключение CSS/JS
├── styles.css           # ВСЕ стили экрана (~2800 строк), префикс .preparaty
├── logic.js             # ВСЯ логика (~3900 строк), IIFE + mountPreparaty
├── data-boot.js         # Запасная копия trades/interactions/shellTabs для file://
├── data/
│   ├── trades.json      # Торговые имена, дозы, формы по МНН
│   ├── interactions.json# Взаимодействия: МНН → массив пар
│   └── shell-tabs.json  # Не медикаменты (диагностика и т.д.)
├── assets/              # Логотип, иконки шапки
├── DOCUMENTATION.md     # Краткое описание экрана для дизайнера
└── МИГРАЦИЯ-NEXT-МЕДИКАМЕНТЫ.md  # Этот документ
```

| Файл | Роль при миграции |
|---|---|
| `logic.js` | Источник бизнес-логики → хуки / сервисы / компоненты React |
| `styles.css` | Источник визуала → CSS Modules / Tailwind-токены / styled; **не трогать чужие экраны** — всё под `.preparaty` |
| `preview.html` / `#preparaty-catalog` | Пример входного каталога препаратов |
| `data/trades.json` | Справочник торговых |
| `data/interactions.json` | Справочник взаимодействий |
| `markup.html` | Слои: `[data-role=list]`, `info-modal`, `popover`, `interactions`, `scheme-modal`, `combo-modal` |

Точка входа JS:

```js
mountPreparaty(document);           // авто при загрузке
window.mountPreparaty(el, { catalog });
```

Событие наружу (для Next — колбэки/props):

```js
root.addEventListener("preparaty:action", (e) => {
  // e.detail = { type, ...payload }
});
```

---

## 2. Рекомендуемая структура в Next.js

```
src/
  features/prescriptions/          # или medications /
    components/
      DrugList.tsx                 # список строк
      DrugRow.tsx                  # одна строка
      DoseField.tsx                # доза: input + ▾
      DrugNameMenu.tsx             # popover торговых / альтернатив
      DrugInfoModal.tsx            # карточка i
      CardComboField.tsx           # доза/форма в карточке (input+▾)
      InteractionsPanel.tsx        # preparaty__ix
      SchemeWizardModal.tsx
      ComboWizardModal.tsx
    hooks/
      usePreparatyState.ts         # аналог state в mountPreparaty
      useDrugInteractions.ts       # analyzeInteractions
    lib/
      normalizeItem.ts
      tradeBook.ts                 # tradeBook, doseOptions, formOptions, applyTrade
      displayName.ts
      namesMatch.ts
      severityOf.ts
    types/
      catalog.ts
      trades.ts
      interactions.ts
    data/                          # или fetch из API/CMS
      trades.json
      interactions.json
    styles/
      preparaty.module.css         # перенос styles.css с префиксом
```

Принципы:

1. **Один источник правды** — React state (как `state` в `logic.js`), не DOM-строки.
2. Стили экрана **изолировать** (CSS Module / scoped), имена классов можно сохранить `preparaty__*` для сверки с макетом.
3. Данные `trades` / `interactions` — `import` JSON или `fetch` на сервере / клиенте.
4. Каталог препаратов — props страницы / React Query / server component props.

---

## 3. Модели данных

### 3.1. Каталог (`#preparaty-catalog` / `options.catalog`)

```ts
type Catalog = {
  diagnosis: string;           // "K26: Язвенная болезнь"
  tabs: Tab[];                 // вкладки; для медикаментов нужен id: "drugs"
  items: CatalogItem[];        # только медикаменты вкладки «Препараты»
};

type Tab = {
  id: string;                  // "drugs" | "diag-req" | ...
  label: string;
  active?: boolean;
  enabled?: boolean;
};
```

### 3.2. Виды строк `CatalogItem.kind`

| kind | Смысл | Выбор названия | Взаимодействия |
|---|---|---|---|
| `trade` | Один МНН (`inn`) | Меню торговых из `trades[inn]` | Да, по `selectedInn \|\| inn` |
| `alternatives` | Группа МНН (`alternatives[]`) | Сначала МНН, потом торговое | Да, после выбора МНН |
| `scheme` | Схема из 3 компонентов | Мастер схемы | Да, если есть итоговый МНН/пики (сейчас взаимодействия по `item.inn/selectedInn` строки) |
| `combo` | Набор 3 ДВ в одном торговом | Мастер комбинации | Да |
| `plain` | Текст без базы trades | Без ▾ у названия | Только если есть `inn` |
| `extra-drug` | Добавлен сверх КР | Как `trade` | Да |

Поля каталожной строки (из preview):

```ts
type CatalogItem = {
  id: string;                  // стабильный id: "clarithromycin"
  kind: "trade" | "alternatives" | "scheme" | "combo" | "plain" | "extra-drug";
  name: string;
  inn?: string;                // UPPERCASE МНН для trade
  qc?: string;                 // "КК" — критерий качества (бейдж)
  level?: string;              // "А1", "C4" — уровень достоверности
  hint?: string;               // текст подсказки / суть в карточке i
  scheme?: string;             // полный текст схемы из КР
  schemeShort?: string;        // краткая схема в поле строки
  course?: string;
  courseShort?: string;
  alternatives?: Alternative[]; // для alternatives / combo
  components?: SchemeComponent[]; // для scheme
  composition?: string[];      // для combo (опционально)
};

type Alternative = { inn: string; label: string; composition?: string[] };

type SchemeComponent =
  | { id: string; label: string; kind: "trade"; inn: string }
  | { id: string; label: string; kind: "alternatives"; alternatives: Alternative[] };
```

Пример схемы «Стандартная тройная терапия» (`id: triple`):

- слот 1: ИПН (`alternatives`: омепразол, эзомепразол, пантопразол, рабепразол)
- слот 2: Амоксициллин (`trade`, `АМОКСИЦИЛЛИН`)
- слот 3: Кларитромицин (`trade`, `КЛАРИТРОМИЦИН`)

### 3.3. Runtime-поля после `normalizeItem`

При монтировании каждый item клонируется и дополняется:

```ts
type DrugItem = CatalogItem & {
  selected: boolean;           // в корзине / мультивыбор
  selectedInn: string;         // = inn изначально
  selectedTrade: string;
  selectedDose: string;
  selectedForm: string;        // часто UPPER из базы; в UI показывают prettyForm
  commentShort: string;
  componentPicks: Record<string, ComponentPick>; // scheme
  intake: {
    morning: boolean;
    day: boolean;
    evening: boolean;
    night: boolean;
  };
  intakeRelation: "" | "before" | "with" | "after";
};

type ComponentPick = {
  inn: string;
  label: string;
  trade: string;
  dose?: string;
  form?: string;
};
```

**Важно:** `normalizeItem` всегда ставит `selected: false` и чистит trade/dose/form. Не мутировать исходный JSON каталога.

### 3.4. `trades.json`

Ключ — МНН UPPERCASE (`"КЛАРИТРОМИЦИН"`).

```ts
type TradesDb = Record<string, TradeBook>;

type TradeBook = {
  inn: string;
  popular?: string[];          // подсказка в шапке меню
  composition?: string[];      // для наборов
  trades: TradeEntry[];
};

type TradeEntry = {
  trade: string;               // "Клацид"
  variants: TradeVariant[];
};

type TradeVariant = {
  dose: string;                // "500 мг"
  form: string;                // "ТАБЛЕТКИ, ПОКРЫТЫЕ ОБОЛОЧКОЙ"
  unit?: string;
  atc?: string;
  smnn?: string;
};
```

Доступ: `tradeBook(inn) = trades[inn] || trades[inn.toUpperCase()]`.

### 3.5. `interactions.json`

Ключ — МНН источника. Значение — массив связей:

```ts
type InteractionsDb = Record<string, InteractionRow[]>;

type InteractionRow = {
  target: string;              // МНН или группа ("ВАРФАРИН", "ИПП", …)
  type?: number;
  level?: number;              // 1..; низкий → тяжелее
  comment: string;
  alternative?: {
    name: string;
    badge?: string;
    text?: string;
  } | null;
};
```

---

## 4. Состояние приложения (аналог `state`)

```ts
type PreparatyState = {
  // каталог
  diagnosis: string;
  tabs: Tab[];
  activeTab: string;           // для миграции медикаментов держать "drugs"
  items: DrugItem[];           // главный список препаратов

  // справочники
  trades: TradesDb;
  interactions: InteractionsDb;

  // UI overlays
  popover: null | {
    type:
      | "name" | "hint" | "info" | "dose" | "form"
      | "scheme" | "course" | "comment" | "note-edit"
      | "scheme-wizard" | "combo-wizard";
    itemId: string;
    stage?: string;
    inn?: string;
    sourceField?: string;
  };
  wizard: null | { itemId: string; step: number; stage?: "review"; inn?: string };
  comboWizard: null | { itemId: string; stage: "kits" | "trades" | "review"; inn?: string };

  infoFocus: "" | "comment" | "form" | "dose" | "scheme" | "course";
  infoCombo: null | "dose" | "form";  // открытый ▾ в карточке i

  // взаимодействия
  ixIndex: number;             // текущая пара в карусели
  ixForceOpen: boolean;        // показать панель после выбора

  // защита мультивыбора
  toggleLock: null | { id: string; at: number };

  // сверх КР (если переносите)
  extraSeq: number;
};
```

Рендер в исходнике **полный** (`render()` → list + cart + interactions + все модалки). В React — точечные обновления по подписке на куски state.

---

## 5. Мультивыбор препаратов

### 5.1. UI

- Элемент: `<button type="button" class="preparaty__checkbox">`, **не** `<input type="checkbox">`.
- Классы: `is-checked` + текст `✓` при `selected`.
- `aria-pressed`, `aria-label="Выбрать {name}"`.
- Размер клика: визуально ~22×22, псевдоэлемент `::before { inset: -6px }` расширяет hit-area.

### 5.2. Логика `toggle`

Файл: `logic.js`, обработчик `data-action="toggle"` (и `toggle-name` для classic).

Алгоритм:

1. `preventDefault` + `stopPropagation`.
2. Антидребезг: если тот же `item.id` кликали < 350 мс назад — выход (`toggleLock`).
3. `item.selected = !item.selected`.
4. `ixIndex = 0`; если стало `selected` → `ixForceOpen = true`.
5. Закрыть popover (кроме `info`), сбросить wizard/comboWizard.
6. Emit `toggle` → перерисовка.

**Почему не checkbox:** раньше был `<input type="checkbox">` + обработчики `click` и `change` → двойной toggle (выбор «отскакивал»). Только кнопка + один обработчик.

### 5.3. Кто попадает в «лекарственные» взаимодействия

```js
selectedDrugItems() = state.items.filter(i => i.selected)
```

Classic/custom в `analyzeInteractions` **не участвуют**. Extra-drug в `state.items` — участвует.

### 5.4. Связь с корзиной

- Группа корзины для препаратов: **«Лечение»** (`cartGroupLabel`).
- Счётчик корзины = все выбранные (включая classic), но для миграции медикаментов важны `selectedDrugItems`.
- Снятие из корзины: `cart-remove` → `item.selected = false` (для extra-drug — удаление из `items`).

### 5.5. Info-карточка «В корзину»

`data-action="info-toggle"` — тоже **кнопка** (не label+checkbox), тот же `toggleLock`, emit `toggle`.

---

## 6. Строка препарата (поля выбора)

### 6.1. Сетка CSS

Класс строки: `.preparaty__row`

```css
grid-template-columns:
  auto                          /* first: checkbox + qc + level */
  minmax(120px, 1.1fr)          /* name */
  minmax(64px, 0.5fr)           /* dose */
  minmax(64px, 0.5fr)           /* form */
  minmax(64px, 0.5fr)           /* scheme */
  minmax(56px, 0.4fr)           /* course */
  283px;                        /* row-end: i + comment pill */
```

Модификаторы строки:

- `--scheme`, `--combo`, `--extra` — фон
- `is-selected` — зелёный фон выбранного
- `is-ok` / `is-warn` / `is-block` — подсветка по взаимодействиям (поверх selected)
- `is-open` — открыт popover у строки

### 6.2. Блок `.preparaty__first`

1. Чекбокс-кнопка (`toggle`)
2. `markCell("qc", …)` → кнопка `.preparaty__qc` или пустой `.preparaty__slot`
3. `markCell("level", …)` → `.preparaty__level` или пустой slot

**Нюанс:** пустые qc/level **не убирают колонку** — название не съезжает (`preparaty__slot`).

Клик по qc/level → `data-action="hint"` → popover с `item.hint`.

### 6.3. Название

- `displayName(item)`: trade → `selectedTrade` или `name`; alternatives → titleCase МНН или name; scheme/combo → свои правила.
- `displaySub(item)`: «Выберите торговое наименование» / состав схемы / composition.
- Если `isSelectable(item)` — кнопка `.preparaty__name.is-selectable` + шеврон SVG + `data-action="name"`.
- Extra-drug: бейдж `.preparaty__extra-badge` «сверх КР».

`isSelectable`:

- trade/extra-drug: есть `tradeBook(inn)`
- alternatives/combo: есть `alternatives.length`
- scheme: есть `components.length`

Без загруженного `trades.json` у trade **пропадает** ▾ и меню — критичный нюанс миграции (данные должны быть доступны на клиенте).

### 6.4. Доза (`.preparaty__dose`)

Функция `doseFieldHtml`:

- Всегда `<input class="preparaty__field preparaty__field--dose" data-field="dose">`, placeholder «Доза».
- Если `doseOptions(item).length > 0` — класс `has-list` + кнопка `.preparaty__dose-toggle` `data-action="dose"` (▾).
- `doseOptions`: варианты `dose` из `tradeVariants(item)` (текущее торговое); иначе все варианты всех trades данного МНН.
- Popover type `dose` → список `pick-dose`.
- Свободный ввод: `input` → `edit-dose`, `selectedDose = value`.

После `pick-dose`: если форма не совместима с вариантами этой дозы — подставить `form` первого подходящего variant.

### 6.5. Форма / Схема / Курс

Обычные `<input class="preparaty__field" data-field="form|scheme|course">`.

- Форма показывает `prettyForm(selectedForm)` (первая буква заглавная, остальное lower).
- Двойной клик по scheme/course/form/comment → открыть info с `infoFocus` на поле.
- Ввод → `edit-*`.

### 6.6. Конец строки `.preparaty__row-end`

- Кнопка `.preparaty__info` текст `i`, `data-action="info"`.
- Кнопка `.preparaty__comment-pill` (`is-filled` если есть текст), `data-action="comment"` → открывает **info** с фокусом на комментарий (не отдельный note для drugs).

---

## 7. Меню торговых наименований

### 7.1. Открытие

`data-action="name"`:

- scheme → `openSchemeWizard`
- combo → `openComboWizard`
- иначе → `openPopover("name", id)`

### 7.2. `renderNameMenu` / `renderTradeOptions`

Для `trade` / `extra-drug`:

- Заголовок: «Популярные торговые наименования: …» или «Торговые наименования»
- Список кнопок `.preparaty__option` с `data-action="pick-trade"`, `data-inn`, `data-trade`
- В `<small>` — первая variant: `dose · form.lower`

Для `alternatives` без выбранного МНН — список альтернатив `pick-alternative`.  
После выбора МНН — stage trades.

### 7.3. `applyTrade(item, inn, trade)`

1. Найти entry в book.trades
2. Взять `variants[0]`
3. Записать `selectedInn`, `selectedTrade`, `selectedDose`, `selectedForm`
4. Для extra-drug обновить `inn` и `name`

После pick-trade: `item.selected = true`, `ixForceOpen = true`, закрыть popover.

Позиционирование popover: `placePopover()` — относительно `[data-popover-anchor="name:id"]` внутри `.preparaty__app`.

---

## 8. Карточка «i» (info modal)

### 8.1. Слой DOM

`[data-role="info-modal"]` → `.preparaty__info-layer`  
Диалог: `.preparaty__info-dialog`  
Backdrop: `.preparaty__info-backdrop` `data-action="close-info"`

Открытие: `state.popover = { type: "info", itemId }`.

### 8.2. Структура UI

```
.head
  title (name/trade)
  badges: тип строки + статус взаимодействия (ok/warn/block)
  preview status line (assignmentPreview)
  [В корзину] [×]
.layout (2 колонки)
  .card-assign «Назначение»
    слоты scheme/combo + кнопка мастера
    fields: Доза | Форма   ← CardComboField
    Приём: утро/день/вечер/ночь + relation
    Схема (wide)
    Курс: пресеты 7/10/14 + свой input
    Комментарий (textarea)
    [Сбросить] [Готово]
  .card-ref «Справка»
    Суть (hint) + dl: МНН, АТХ, Формы
    Как обычно дают + [Подставить в назначение]
    Осторожно (пары взаимодействий этого препарата)
```

### 8.3. Комбо-поля доза/форма в карточке

Функция `cardComboFieldHtml` — **единое поле** (не select + «ниже своё»):

- Label span: «Доза» / «Форма»
- `.preparaty__card-combo` (+ `has-list` / `is-open`)
- input `data-info-field="dose|form"`, placeholder = label
- Если есть options — кнопка `.preparaty__card-combo-toggle` `data-action="info-combo"` `data-combo="dose|form"`
- Открытый список: `.preparaty__card-combo-list` → `info-pick-dose` / `info-pick-form`

State: `infoCombo: "dose" | "form" | null`.

`applyInfoField` синхронизирует dose↔form через variants; может пересобрать `schemeShort` из `buildSchemeFromParts` (доза + приём + relation).

### 8.4. Приём

- Чекбоксы в label `data-action="info-intake"` `data-intake="morning|day|evening|night"`
- Кнопки relation `data-action="info-relation"` `data-relation="|before|with|after"`
- Labels для схемы: утром / днём / вечером / на ночь; до еды / во время еды / после еды

### 8.5. Действия карточки

| action | Поведение |
|---|---|
| `info-recommend` | Подставить scheme/course из КР; если dose/form пусты — первые из options |
| `info-reset` | Очистить dose/form/scheme/course/comment/intake |
| `info-toggle` | Мультивыбор |
| `close-info` / Готово | `popover=null`, `infoCombo=null` |
| `info-open-scheme` / `info-open-combo` | Закрыть info, открыть мастер |

### 8.6. `assignmentPreview` / `drugInfoFacts`

Preview: `trade|name · dose · form · times · course`.  
Facts: МНН, ATC из variants, список forms, description из hint.

### 8.7. CSS карточки (ключевые классы)

`preparaty__info-layer`, `__info-dialog`, `__info-backdrop`, `__card-head`, `__card-layout`, `__card-assign`, `__card-ref`, `__card-fields`, `__card-field`, `__card-combo*`, `__card-checks`, `__card-rels`, `__card-cart`, `__card-slots`, `__card-badge--ok|warn|block`, `__scheme-btn`.

---

## 9. Межлекарственные взаимодействия

### 9.1. Алгоритм `analyzeInteractions`

Файл: `logic.js` ~1305–1364.

Вход: `selectedDrugItems()`, `state.interactions`.

```
для каждого selected left:
  leftInn = selectedInn || inn (UPPER)
  для каждой row в interactions[leftInn]:
    для каждого selected right ≠ left:
      если namesMatch(row.target, rightInn):
        добавить уникальную пару (ключ sorted inns + target)
        severity = severityOf(row)
        обновить statusById[left/right] = block|warn (block важнее)
status по умолчанию для выбранных без пар: "ok"
pairs.sort: block раньше warn
return { pairs, statusById, selectedCount }
```

### 9.2. `namesMatch(target, inn)`

- Точное / substring совпадение UPPER
- Спецправила: тетрациклин, амоксициллин
- Группа ИПН: target содержит «ПРОТОНН» или «ИПП» ↔ омепразол|эзомепразол|пантопразол|лансопразол|рабепразол

### 9.3. `severityOf(row)`

- `block`, если `level <= 1` ИЛИ в comment regex: нельзя|противопоказ|избегать|…|снижает.*всасыван
- иначе обычно `warn` (level 2–3 или слова осторожн|монитор|…)

### 9.4. Панель UI `renderInteractions` → `[data-role="interactions"]`

| Условие | UI |
|---|---|
| `selectedCount === 0` | `hidden`, очистить |
| selected > 0, pairs пусто | зелёная панель `--ok --single`: «взаимодействий не найдено (0)» |
| есть pairs | `--block` или `--warn`; карусель `ixIndex`; пара имён-кнопок; комментарий; опционально блок «Замена» |

Действия:

- `ix-prev` / `ix-next` — листание
- `ix-focus` — scroll к строке + flash `is-ix-flash`
- `ix-focus-both` — обе строки
- `replace-alternative` — хардкод-логика замены на доксициклин для демо (при переносе заменить на данные `pair.alternative`)
- `check-interactions` — принудительно открыть панель

### 9.5. Подсветка строк

В `renderList`: `ixStatus = item.selected ? statusById[id] || "ok" : ""` → класс `is-{ok|warn|block}`.

**Не** ставить ✓/! в саму строку списка — только цвет фона и inset border (см. CSS).

### 9.6. CSS взаимодействий

`.preparaty__ix`, `--block`, `--warn`, `--ok`, `--single`, `__ix-main`, `__ix-icon`, `__ix-nav`, `__ix-pair`, `__ix-drug`, `__ix-badge--*`, `__ix-alt`, `__ix-foot`.  
Анимация: `.preparaty__row.is-ix-flash`.

---

## 10. Схема и комбинация (кратко для переноса)

### Scheme wizard

- State: `wizard = { itemId, step, stage? }`, `popover.type = "scheme-wizard"`
- Слоты 1..3; клик `wizard-slot` меняет **только** этот слот (`clearSchemePickAt`), остальные пики сохраняются
- `alternatives` слот: сначала МНН (`wizard-alternative`), потом trade
- `trade` слот: сразу список торговых
- `completeScheme`: все пики готовы → `selected=true`
- Review: «К началу» сбрасывает все три (`clearSchemePicksFrom(0)`)

### Combo wizard

- State: `comboWizard = { itemId, stage: kits|trades|review, inn? }`
- Выбор набора (МНН с composition) → торговое → review
- `combo-slot` на review возвращает к смене trade того же inn

Модалки: `[data-role=scheme-modal]`, `[data-role=combo-modal]`, классы `preparaty__scheme-*`.

---

## 11. Медикамент сверх КР

Из модалки корзины (`cartModal.itemKind === "drug"`):

1. Поиск по `trades` (`searchDrugCatalog`)
2. Выбор МНН/trade → `applyExtraTradeChoice`
3. Save → push в `state.items`:

```ts
{
  id: "extra-" + extraSeq,
  kind: "extra-drug",
  name: trade,
  inn,
  selected: true,
  selectedInn, selectedTrade, selectedDose, selectedForm,
  // ... normalize-поля
}
```

Строка рендерится в том же DrugList с бейджем «сверх КР», участвует в `selectedDrugItems` и взаимодействиях, в корзине группа «Лечение».

---

## 12. Внешние события (`preparaty:action`)

Перенос: `onAction?: (detail) => void` или отдельные колбэки.

Критичные для медикаментов:

| type | Payload (основные поля) |
|---|---|
| `toggle` | `{ itemId, selected, name }` |
| `open-name` / `pick-trade` / `pick-alternative` | inn, trade, dose, form |
| `open-dose` / `pick-dose` | dose, form |
| `edit-dose` / `edit-form` / `edit-scheme` / `edit-course` / `edit-comment` | значения полей |
| `open-info` / `close-info` | itemId, focus? |
| `edit-intake` / `edit-intake-relation` | intake, relation, scheme |
| `info-recommend` / `info-reset` | — |
| `check-interactions` / `ix-prev` / `ix-next` / `ix-focus` / `ix-focus-both` | — |
| `replace-alternative` | itemId, name |
| `open-scheme-wizard` / `pick-scheme-*` / `scheme-complete` | — |
| `open-combo-wizard` / `pick-combo-*` / `combo-complete` | — |
| `cart-extra-add` / `cart-extra-save` | сверх КР |

---

## 13. Карта стилей по фичам

Файл: **`preparaty/styles.css`**. Все правила внутри/под `.preparaty { … }`. CSS-переменные:

```css
--blue: #0085ff;
--blue-soft: #edf7ff;
--ink: #10253f;
--muted: #8a8a8a;
--line: #e0e3e7;
--green: #178e43;
--font: Arial, sans-serif;
```

| Фича | Классы (искать в styles.css) |
|---|---|
| Строка списка | `__row`, `__first`, `__name`, `__name-sub`, `__field`, `__dose`, `__dose-toggle`, `__row-end`, `__info`, `__comment-pill`, `__checkbox`, `__qc`, `__level`, `__slot`, `__extra-badge` |
| Состояния строки | `is-selected`, `is-ok`, `is-warn`, `is-block`, `is-open`, `is-ix-flash` |
| Popover | `__popover`, `__popover-head`, `__option`, `__option.is-current` |
| Info modal | `__info-layer`, `__info-dialog`, `__card-*`, `__card-combo*` |
| Взаимодействия | `__ix`, `__ix-*` |
| Scheme/Combo | `__scheme-layer`, `__scheme-dialog`, `__scheme-btn`, `__card-slots` |
| Корзина (лечение) | `__cart`, `__cart-item`, `__cart-item--extra` |

Шрифт и размеры названий/полей сознательно как у диагностики (Arial 13px) — не менять на Inter/system без согласования.

Адаптив: в конце файла media-queries с `grid-area` для mobile раскладки строки.

---

## 14. Карта логики по функциям (`logic.js`)

| Функция | Назначение |
|---|---|
| `normalizeItem` | Runtime-поля item |
| `tradeBook` / `tradeVariants` / `doseOptions` / `formOptions` | Справочник |
| `prettyForm` / `uniqueField` / `titleCaseInn` | Форматирование |
| `displayName` / `displaySub` / `isSelectable` | UI названия |
| `doseFieldHtml` / `cardComboFieldHtml` / `fieldInput` / `markCell` | Разметка полей |
| `applyTrade` / `applyInfoField` | Запись выбора |
| `buildSchemeFromParts` / `assignmentPreview` | Тексты назначения |
| `selectedDrugItems` | Выборка для IX |
| `itemInn` / `namesMatch` / `severityOf` / `analyzeInteractions` | Движок взаимодействий |
| `renderList` / `renderInfoModal` / `renderInteractions` / `renderPopover` | View (заменить React) |
| `renderNameMenu` / `renderTradeOptions` | Меню торговых |
| `openSchemeWizard` / `completeScheme` / … | Схема |
| `openComboWizard` / `completeCombo` / … | Комбо |
| `drugInfoFacts` / `cartInteractionsFor` | Справка в i |
| Click/input/change/mousedown handlers | Event layer |

Публичный API после mount:

```js
{
  destroy, setCatalog, setTrades, setInteractions,
  getSelected, … 
}
```

(см. конец `logic.js`).

---

## 15. Пошаговый план генерации кода в Next

1. **Types** — перенести §3 в `types/*.ts`.
2. **Data** — положить `trades.json` / `interactions.json` (или API), убедиться что ключи МНН UPPERCASE.
3. **Pure libs** — `tradeBook`, `doseOptions`, `analyzeInteractions`, `namesMatch`, `severityOf`, `applyTrade`, `displayName` — unit-тесты без DOM.
4. **State hook** — `usePreparatyMedications(catalog, trades, interactions)` с методами toggle, pickTrade, setField, openInfo, …
5. **DrugRow + DoseField** — сверка с preview визуально.
6. **Name menu** — portal/popover.
7. **Info modal** — CardComboField, intake, recommend/reset.
8. **InteractionsPanel** — карусель + подсветка строк через `statusById`.
9. **Scheme/Combo wizards**.
10. **Styles** — перенести куски CSS из §13; сохранить переменные и размеры.
11. **Интеграция корзины Next** — читать `items.filter(i => i.selected)`, группа «Лечение».
12. **События** — прокинуть `onToggle` / `onChange` наверх для записи в карту пациента.

### Критерии готовности

- [ ] Можно выбрать 3+ препарата, все остаются в selection
- [ ] У trade есть ▾ названия и список из trades
- [ ] У дозы ▾ при наличии variants; свободный ввод работает
- [ ] `i` открывает карточку; доза/форма — одно поле с ▾
- [ ] При выборе пары с interactions панель показывает warn/block; строки подсвечены
- [ ] Extra-drug (если в скоупе) виден в списке и в IX
- [ ] Без trades на клиенте UI явно деградирует предсказуемо (нет ложных select)

---

## 16. Нюансы и ловушки

1. **Без HTTP/данных trades** меню торговых и ▾ дозы исчезают (`isSelectable` false, `doseOptions` []). В дизайнере лечится `data-boot.js`; в Next — обязательный import/fetch.
2. **Мультивыбор только button**, debounce 350 мс, не смешивать с native checkbox change.
3. **Форма в базе UPPER**, в инпуте — `prettyForm`; при сравнении variants учитывать оба регистра.
4. **Взаимодействия только по `state.items`**, не по услугам.
5. **`namesMatch` для ИПН** — без него PPI-группа не матчится с конкретными МНН.
6. **Popover vs Info**: mousedown снаружи закрывает popover, но клики по `toggle`/`info`/`dose`/`name` в allowlist не должны сбрасывать жест.
7. **Info dose/form** — локальный `infoCombo`, не глобальный popover type `dose` (конфликт с открытой модалкой).
8. **Двойной клик** по полям строки открывает info с фокусом — сохранить UX.
9. **Scheme slot edit** меняет один слот; не очищать соседние.
10. **Стили** только под `.preparaty` — при переносе не инжектить глобально без префикса.
11. **`replace-alternative`** в исходнике частично захардкожен под доксициклин — при миграции опереться на `pair.alternative` из JSON.
12. Каталог в preview — демо K26; в проде каталог приходит с бэка КР, структура полей та же.

---

## 17. Минимальный контракт React-компонентов

```tsx
// Пример контракта для генерации

type MedicationsBoardProps = {
  catalog: Catalog;
  trades: TradesDb;
  interactions: InteractionsDb;
  onAction?: (e: { type: string } & Record<string, unknown>) => void;
};

// DrugRow
type DrugRowProps = {
  item: DrugItem;
  ixStatus?: "" | "ok" | "warn" | "block";
  onToggle: (id: string) => void;
  onOpenName: (id: string) => void;
  onOpenInfo: (id: string, focus?: string) => void;
  onChangeField: (id: string, field: "dose" | "form" | "scheme" | "course" | "comment", value: string) => void;
  onOpenDoseList: (id: string) => void;
};
```

Состояние popover/modal — в родителе или в zustand/context, зеркалируя §4.

---

## 18. Ссылки на исходные якоря в коде

| Тема | Где смотреть |
|---|---|
| State + normalize | `logic.js` ~79–121 |
| Multiselect toggle | `logic.js` поиск `action === "toggle"` |
| doseFieldHtml / cardCombo | `logic.js` ~480–560 |
| renderList (строка) | `logic.js` ~759–868 |
| analyzeInteractions | `logic.js` ~1305–1364 |
| renderInteractions | `logic.js` ~1366–1490 |
| renderInfoModal | `logic.js` ~2132–2430 |
| applyTrade | `logic.js` ~2597–2613 |
| CSS variables + row grid | `styles.css` ~1–15, ~448–515 |
| IX styles | `styles.css` ~935+ |
| Card combo styles | `styles.css` поиск `card-combo` |
| Demo catalog | `preview.html` `#preparaty-catalog` |
| Trades / IX JSON | `data/trades.json`, `data/interactions.json` |

---

## 19. Что считать эталоном визуала

Открыть `preparaty/preview.html` через локальный HTTP (нужны JSON) или с `data-boot.js`. Сценарий проверки:

1. Вкладка «Препараты»
2. Выбрать Ребамипид + Кларитромицин + Метронидазол
3. У кларитромицина открыть название → список Клацид/Фромилид/…
4. ▾ дозы → 250/500 мг
5. `i` → комбо доза/форма, приём, подставить из КР
6. Панель взаимодействий внизу / подсветка строк

Любая генерация в Next должна проходить этот сценарий один в один по поведению.

---

*Документ описывает состояние модуля `preparaty` на момент подготовки миграции медикаментов. Оболочка EasyMed (шапка, classic-вкладки, услуги) намеренно вынесена за скобки ядра — см. §0.*

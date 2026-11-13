# Mini Cart

Изолированный React-модуль компактной мини-корзинки + Document Picture-in-Picture.

## Feature flags

```bash
NEXT_PUBLIC_MINI_CART=1
```

| Константа | Условие |
|---|---|
| `MINI_CART_ENABLED` | флаг = 1 |
| `MINI_CART_PREVIEW_ENABLED` | флаг = 1 и `NODE_ENV !== "production"` |

Кнопка «Свернуть» на `/cart` и PiP-интеграция активны только при `MINI_CART_PREVIEW_ENABLED` (dev).

## Режимы

`full` → `compact` (PiP или in-page fallback) → `docked` (логотип) → обратно.

Открытие PiP только из user gesture (`requestCompactFromGesture`).

## PiP и стили

- `pip/documentPip.ts` — requestWindow, копирование stylesheet/style, mount `#em-mini-cart-pip-root.emMiniCart`
- UI остаётся в React-дереве opener; панель и оверлеи уходят через `createPortal`
- Модалки/поповеры — `MiniCartPortal` → `portalRoot` (PiP root / host `.emMiniCart`)
- Системный крестик PiP (`pagehide`): `flushSync` снимает порталы, пока document ещё жив; `closeOverlays` сбрасывает модалки / drug-details / custom-items / форму custom item; `isLivePortalTarget` не пускает createPortal в мёртвый window

**Важно:** портальные оверлеи рендерятся **вне** `.preparaty`. Поэтому:

- CSS-токены и сбросы `button/input` объявлены на `.emMiniCart` (не только на `.preparaty`);
- z-index оверлеев (1300) задан без требования `.preparaty.is-collapsed`;
- классы разметки должны совпадать с прототипом (`preparaty__option`, `preparaty__card-head`, `preparaty__note-*`).

Стили генерируются `scripts/extract-mini-cart-css.mjs` из `mini-korzinka/styles.css` + foundation/portal patches в скрипте. Повторный запуск скрипта сохраняет эти патчи.

Дополнительно (не перезаписываются extract-скриптом):

- `styles/miniCartDrugDetails.css` — экран препарата;
- `styles/miniCartInfoModal.css` — шапка/прокрутка/выравнивание info-модалки нелекарственных позиций;
- `styles/miniCartAddModal.css` — поля формы пользовательской позиции;
- `styles/miniCartCustomItems.css` — экран «Дополнительно» и ряд кнопок footer.

## Preview

`/dev/mini-cart-preview` — демо K26 + кнопка открытия PiP.

## Данные и редактирование

Два независимых потока (как в полной корзине):

1. Черновик — `medicationDrafts` / combinations / intake (без auto-check).
2. Выбор — `sections.checked` → SideCart.

Источник: `PrescriptionChecklist` → `assignmentSnapshot` (+ `commentSources`) → `fromDirectoryCart` → MiniCart.

Мутации checklist: `MiniCartAssignmentOps` → `PrescriptionChecklistHandle` (без второго store).

### D3 / D3.1. Пользовательские позиции и общая рекомендация

Единый источник — React-state `SideCart` + `cartStorage` (`customItems` / `generalComments` по `recommendationKey`).

| Операция | Full | Mini |
|---|---|---|
| Добавить / изменить / удалить custom | `CustomCartItemModal` → `setCustomItems` | `MiniCartAddModal` → `SideCartHandle` через ops |
| Общая рекомендация | `RecommendationField` onChange | footer textarea → `setGeneralComment` через ops |

Тип позиции в production: одна сущность `{ id, name, comment }` (услуга/медикамент без раздельных подтипов).  
`id` — `createBrowserId()`; при редактировании id сохраняется.  
Валидация: имя 1…160, первая буква заглавная; комментарий до 500, trim при сохранении.  
Удаление без подтверждения (как в SideCart).  
Общая рекомендация пишется на каждый ввод (как в full); пустой/whitespace очищает storage.

**D3.1:** пользовательские позиции **не** маппятся в раздел «Образ жизни» / `lifestyle`.  
Адаптер отдаёт отдельную коллекцию `customItems`. Вкладка «Образ жизни» зависит только от содержимого КР.

В footer основная строка:

- слева «+ Добавить услугу/медикамент»;
- справа «Дополнительно (N)» → внутренний экран `custom-items`.

Синхронизация Full ↔ Mini: `SideCart` пишет в `cartStorage` + `publishCartSync`; `useDirectoryMiniCartData` перечитывает extras (включая `origin: "local"`).

### Внутренние экраны (без смены URL)

```ts
type MiniCartView =
  | { type: "list" }
  | { type: "drug-details"; itemId: string }
  | { type: "custom-items" };
```

- Кнопка «i» **лекарственной** позиции открывает экран внутри той же мини-корзинки / PiP.
- Диагностика и лечебные мероприятия — `MiniCartInfoModal`.
- «Дополнительно (N)» — `MiniCartCustomItemsScreen` (список / empty / add / edit / delete).
- Добавление и редактирование позиций — `MiniCartAddModal` (portal).
- «Назад» / «Готово» возвращают к списку; `listScrollTop` + активная вкладка / раздел КР сохраняются.
- При expand/dock / системном закрытии PiP внутренние экраны закрываются через `closeInnerView` + `closeCustomItemModal`.

### Экран препарата

Компонент: `components/MiniCartDrugDetailsScreen.tsx`.

Вкладки:

- **Назначение** — доза/форма (каталог + ручной ввод), приём, схема (chips), курс, комментарий врача, превью для пациента, состав схемы + мастер, «Сбросить», чекбокс «Включить в назначения».
- **Информация** — accordion: Справка, Комментарий из КР (если есть), Как указано в КР (+ подставить), Осторожно.

Поповеры дозы/формы: `MiniCartCatalogCombo` → `MiniCartPortal` + `ownerDocument` PiP.

### Экран «Дополнительно»

Компонент: `components/MiniCartCustomItemsScreen.tsx`.

- Заголовок «Дополнительно (N)», подпись «Назначения, добавленные врачом».
- Список: название + комментарий (столбцом), ✎ / × справа.
- Пустое состояние без авто-закрытия экрана.
- Добавление с основного экрана не переключает на «Дополнительно»; добавление с внутреннего экрана оставляет на нём.

## Следующий этап

D4 — копирование выбранных назначений.

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

## PiP

- `pip/documentPip.ts` — requestWindow, стили, mount
- `hooks/useDocumentPip.ts` — жизненный цикл
- UI остаётся в React-дереве opener; в PiP уходит через `createPortal`
- Модалки/поповеры — `MiniCartPortal` в `ownerDocument` PiP

## Preview

`/dev/mini-cart-preview` — демо K26 + кнопка открытия PiP.

## Данные

На `/cart` при `MINI_CART_PREVIEW_ENABLED` мини-корзинка получает view-model из:

- `checklistSections` / `diagnosisTitle` страницы корзины;
- `useMedsCatalog(recommendationKey)` → существующий `medsCatalogSession` (без повторного fetch);
- таблиц приложения А3, уже загруженных страницей;
- снимка назначений `ChecklistAssignmentSnapshot` из `PrescriptionChecklist` (`medicationDrafts`, intake, combinations, itemStates);
- custom items / общей рекомендации из `cartStorage` (как у SideCart).

Адаптер: `adapters/fromDirectoryCart.ts`. Хук: `hooks/useDirectoryMiniCartData.ts`.

В реальном режиме `/cart` — `assignmentsReadOnly`: отображение без локального сохранения правок.

Demo-preview по-прежнему со своим локальным UI-state.

Пока **не** подключены: двустороннее редактирование, поиск МКБ, запись в карту / копирование, шаблоны, AI, interactions.

## Следующий этап

Подэтап C — поиск и смена МКБ; затем двустороннее редактирование назначений.

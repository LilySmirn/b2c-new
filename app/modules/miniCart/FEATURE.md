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

## Данные и редактирование

На `/cart` при `MINI_CART_PREVIEW_ENABLED`:

**Чтение:** view-model из секций, `useMedsCatalog`, appendix A3, `ChecklistAssignmentSnapshot`, custom/recommendation из `cartStorage`.

**Запись (D1):** `assignmentOps` → `PrescriptionChecklistHandle` (тот же `medicationDrafts` / sections):

- toggle чекбоксов;
- комментарии;
- trade-pick + dose/form/scheme/course для обычных препаратов (`kind: trade` / `plain`);
- select-all обязательной диагностики.

Поиск МКБ в реальном компактном UI скрыт (`hideMkbSearch`). Смена МКБ — только через полноразмерный справочник.

**Пока недоступно из мини-корзинки (D2/D3):** группы (`alternatives`), схемы/комбинации, custom items, редактирование общей рекомендации, запись в карту / копирование / шаблоны / AI / interactions.

Demo-preview — локальный UI-state без `assignmentOps`.

## Следующий этап

D2 — группы и схемы/комбинации; D3 — custom items и общая рекомендация.

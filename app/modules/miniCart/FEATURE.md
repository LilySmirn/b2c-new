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

## Следующий этап

Подключение реальных данных / shared cart sync.

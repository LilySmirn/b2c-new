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

**Важно:** портальные оверлеи рендерятся **вне** `.preparaty`. Поэтому:

- CSS-токены и сбросы `button/input` объявлены на `.emMiniCart` (не только на `.preparaty`);
- z-index оверлеев (1300) задан без требования `.preparaty.is-collapsed`;
- классы разметки должны совпадать с прототипом (`preparaty__option`, `preparaty__card-head`, `preparaty__note-*`).

Стили генерируются `scripts/extract-mini-cart-css.mjs` из `mini-korzinka/styles.css` + foundation/portal patches в скрипте. Повторный запуск скрипта сохраняет эти патчи.

## Preview

`/dev/mini-cart-preview` — демо K26 + кнопка открытия PiP.

## Данные и редактирование

Два независимых потока (как в полной корзине):

1. Черновик — `medicationDrafts` / combinations (без auto-check).
2. Выбор — `sections.checked` → SideCart.

Подробности D1/D2 — в истории интеграции. D3 пока не начат.

## Следующий этап

D3 — custom items и общая рекомендация.

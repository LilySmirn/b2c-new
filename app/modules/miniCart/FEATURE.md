# Mini Cart (компактный интерфейс)

Изолированный React-модуль мини-корзинки, перенесённый из vanilla-прототипа `mini-korzinka/`.

## Статус этапа

- UI компактного режима перенесён на React/TypeScript.
- Shared cart storage / sync **не** подключены.
- Document Picture-in-Picture **не** реализован.
- Кнопка «Свернуть» полноразмерной корзины **не** подключена.

## Feature flag

```bash
NEXT_PUBLIC_MINI_CART=1
```

- `MINI_CART_ENABLED` — будущее включение модуля.
- `MINI_CART_PREVIEW_ENABLED` — preview только вне production при включённом флаге.

## Публичный API

```ts
import { MiniCartHost, MiniCartShell, MINI_CART_ENABLED } from "@/app/modules/miniCart";
```

- `MiniCartHost` — точка подключения (уважает feature flag).
- `MiniCartShell` — контейнер компактного UI; данные и обработчики через props.

## Preview

Временный маршрут: `/dev/mini-cart-preview`

Доступен только при `NEXT_PUBLIC_MINI_CART=1` и `NODE_ENV !== "production"`.
Использует демо-данные K26 из `demo/`.

## Стили

`styles/miniCartScope.css` — извлечённые стили компактного режима, scoped под `.emMiniCart`.
Импортируются из `MiniCartShell` (не глобально в layout).

## Следующие этапы

1. Document Picture-in-Picture.
2. Подключение shared cart storage / sync.
3. Связка с кнопкой «Свернуть» полноразмерной корзины.
4. Реальные API для МКБ / AI / взаимодействий.

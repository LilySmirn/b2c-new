"use client";

import MiniCartShell from "./MiniCartShell";
import { MINI_CART_ENABLED } from "./featureFlag";
import type { MiniCartProps } from "./types";

type MiniCartHostProps = MiniCartProps & {
  /** Force-render even when feature flag is off (только preview). */
  force?: boolean;
};

/**
 * Точка подключения модуля мини-корзинки.
 * На текущем этапе не встраивается в полноразмерную корзину.
 */
export default function MiniCartHost({
  force = false,
  ...props
}: MiniCartHostProps) {
  if (!force && !MINI_CART_ENABLED) return null;
  return <MiniCartShell {...props} />;
}

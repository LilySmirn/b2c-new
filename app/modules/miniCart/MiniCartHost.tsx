"use client";

import { forwardRef } from "react";
import MiniCartShell, { type MiniCartShellHandle } from "./MiniCartShell";
import { MINI_CART_ENABLED } from "./featureFlag";
import type { MiniCartProps } from "./types";

export type MiniCartHostHandle = MiniCartShellHandle;

type MiniCartHostProps = MiniCartProps & {
  /** Force-render even when feature flag is off (только preview). */
  force?: boolean;
};

/**
 * Точка подключения модуля мини-корзинки.
 * PiP / режимы — внутри MiniCartShell; Host только гейтит feature flag.
 */
const MiniCartHost = forwardRef<MiniCartHostHandle, MiniCartHostProps>(
  function MiniCartHost({ force = false, ...props }, ref) {
    if (!force && !MINI_CART_ENABLED) return null;
    return <MiniCartShell ref={ref} {...props} />;
  },
);

export default MiniCartHost;

"use client";

import { forwardRef } from "react";
import MiniCartShell, { type MiniCartShellHandle } from "./MiniCartShell";
import type { MiniCartProps } from "./types";

export type MiniCartHostHandle = MiniCartShellHandle;

/**
 * Точка подключения модуля мини-корзинки.
 * PiP / режимы — внутри MiniCartShell.
 */
const MiniCartHost = forwardRef<MiniCartHostHandle, MiniCartProps>(
  function MiniCartHost(props, ref) {
    return <MiniCartShell ref={ref} {...props} />;
  },
);

export default MiniCartHost;

"use client";

import { useRef, useState } from "react";
import MiniCartHost, {
  type MiniCartHostHandle,
} from "@/app/modules/miniCart/MiniCartHost";
import {
  createDemoDrugItems,
  MINI_CART_DEMO_CATALOG,
  MINI_CART_DEMO_SHELL_TABS,
  MINI_CART_DEMO_TRADES,
} from "@/app/modules/miniCart/demo";
import type { MiniCartDisplayMode } from "@/app/modules/miniCart/types";

/**
 * Клиентский preview на демо-данных K26 + Document PiP.
 * Не подключает shared cart / API.
 */
export default function MiniCartPreviewClient() {
  const hostRef = useRef<MiniCartHostHandle>(null);
  const [mode, setMode] = useState<MiniCartDisplayMode>("full");

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #e8eef5 0%, #f5f7fa 40%, #eceff3 100%)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto 16px",
          fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
          color: "#1f2a37",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
          Dev preview · NEXT_PUBLIC_MINI_CART=1 · Document PiP
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 600 }}>
          Мини-корзинка (компактный UI)
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45 }}>
          Демо K26. Нажмите «Открыть мини-корзинку» — в Chrome/Edge откроется
          Document PiP (или fallback-панель). Режим: {mode}.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #0085ff",
              background: "#0085ff",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
            onClick={() => void hostRef.current?.requestCompactFromGesture()}
          >
            Открыть мини-корзинку (PiP)
          </button>
          <button
            type="button"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #8590a2",
              background: "#fff",
              color: "#1f2a37",
              cursor: "pointer",
              fontSize: 14,
            }}
            onClick={() => setMode("full")}
          >
            Сбросить в full
          </button>
        </div>
      </div>

      <MiniCartHost
        ref={hostRef}
        force
        className="is-preview"
        diagnosis={MINI_CART_DEMO_CATALOG.diagnosis}
        tabs={MINI_CART_DEMO_CATALOG.tabs}
        drugItems={createDemoDrugItems()}
        shellTabs={MINI_CART_DEMO_SHELL_TABS}
        trades={MINI_CART_DEMO_TRADES}
        displayMode={mode}
        onDisplayModeChange={setMode}
      />
    </main>
  );
}

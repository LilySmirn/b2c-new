"use client";

import { MiniCartHost } from "@/app/modules/miniCart";
import {
  createDemoDrugItems,
  MINI_CART_DEMO_CATALOG,
  MINI_CART_DEMO_SHELL_TABS,
  MINI_CART_DEMO_TRADES,
} from "@/app/modules/miniCart/demo";

/**
 * Клиентский preview на демо-данных K26.
 * Не подключает shared cart / API.
 */
export default function MiniCartPreviewClient() {
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
          fontFamily:
            '"Segoe UI", system-ui, -apple-system, sans-serif',
          color: "#1f2a37",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
          Dev preview · NEXT_PUBLIC_MINI_CART=1 · не production
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 22, fontWeight: 600 }}>
          Мини-корзинка (компактный UI)
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45 }}>
          Демо-данные K26. Панель справа в исходных компактных размерах.
          Свернуть — док с логотипом; вкладки AI и взаимодействий — визуально.
        </p>
      </div>

      <MiniCartHost
        force
        initiallyOpen
        className="is-preview"
        diagnosis={MINI_CART_DEMO_CATALOG.diagnosis}
        tabs={MINI_CART_DEMO_CATALOG.tabs}
        drugItems={createDemoDrugItems()}
        shellTabs={MINI_CART_DEMO_SHELL_TABS}
        trades={MINI_CART_DEMO_TRADES}
      />
    </main>
  );
}

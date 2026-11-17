import NoTranslate from "@/app/components/NoTranslate";
import {
  isMiniCartNavEnabled,
  resolveMiniCartNav,
} from "../navFlags";
import type { MiniCartNav } from "../types";

const NAV_ITEMS: Array<{ id: MiniCartNav; label: string; brand?: boolean }> = [
  { id: "clinical-recs", label: "Клинические рекомендации" },
  { id: "easymed-ai", label: "EasyMed AI", brand: true },
  { id: "interactions", label: "Лекарственные взаимодействия" },
];

type MiniCartNavProps = {
  value: MiniCartNav;
  onChange: (nav: MiniCartNav) => void;
};

export default function MiniCartNavTabs({ value, onChange }: MiniCartNavProps) {
  const visibleItems = NAV_ITEMS.filter((item) => isMiniCartNavEnabled(item.id));
  const activeValue = resolveMiniCartNav(value);

  return (
    <div
      className="preparaty__mini-nav"
      role="tablist"
      aria-label="Разделы миникорзинки"
      style={{
        gridTemplateColumns: `repeat(${Math.max(visibleItems.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      {visibleItems.map((item) => {
        const active = item.id === activeValue;
        return (
          <button
            key={item.id}
            type="button"
            className={`preparaty__mini-nav-btn${active ? " is-active" : ""}${
              item.brand ? " notranslate" : ""
            }`}
            translate={item.brand ? "no" : undefined}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
          >
            {item.brand ? <NoTranslate>{item.label}</NoTranslate> : item.label}
          </button>
        );
      })}
    </div>
  );
}

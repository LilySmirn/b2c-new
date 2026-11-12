import type { MiniCartNav } from "../types";

const NAV_ITEMS: Array<{ id: MiniCartNav; label: string }> = [
  { id: "clinical-recs", label: "Клинические рекомендации" },
  { id: "easymed-ai", label: "EasyMed AI" },
  { id: "interactions", label: "Лекарственные взаимодействия" },
];

type MiniCartNavProps = {
  value: MiniCartNav;
  onChange: (nav: MiniCartNav) => void;
};

export default function MiniCartNavTabs({ value, onChange }: MiniCartNavProps) {
  return (
    <div className="preparaty__mini-nav" role="tablist" aria-label="Разделы миникорзинки">
      {NAV_ITEMS.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            className={`preparaty__mini-nav-btn${active ? " is-active" : ""}`}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

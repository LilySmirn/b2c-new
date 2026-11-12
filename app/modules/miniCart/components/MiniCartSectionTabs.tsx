import type { MiniCartTab } from "../types";

type MiniCartSectionTabsProps = {
  tabs: MiniCartTab[];
  activeTab: string;
  page: number;
  onTabChange: (tabId: string) => void;
  onPageChange: (page: number) => void;
};

export default function MiniCartSectionTabs({
  tabs,
  activeTab,
  page,
  onTabChange,
  onPageChange,
}: MiniCartSectionTabsProps) {
  const page0 = tabs.slice(0, 4);
  const page1 = tabs.slice(4, 8);
  const currentPage = page === 1 ? 1 : 0;
  const nextLabel = currentPage === 0 ? "Следующие вкладки" : "Предыдущие вкладки";
  const nextArrow = currentPage === 0 ? "›" : "‹";

  const renderPage = (pageTabs: MiniCartTab[], label: string) => (
    <div className="preparaty__tabs preparaty__tabs--mini" role="tablist" aria-label={label}>
      {pageTabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={`preparaty__tab${active ? " is-active" : ""}`}
            role="tab"
            aria-selected={active}
            disabled={tab.enabled === false}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`preparaty__mini-tabs-shell${currentPage === 1 ? " is-page-1" : " is-page-0"}`}
      aria-label="Раздел назначений"
    >
      <div className="preparaty__mini-tabs-viewport">
        <div
          className={`preparaty__mini-tabs-track${currentPage === 1 ? " is-page-1" : ""}`}
        >
          {renderPage(page0, "Вкладки 1–4")}
          {renderPage(page1, "Вкладки 5–8")}
        </div>
      </div>
      <button
        type="button"
        className="preparaty__mini-tabs-nav"
        aria-label={nextLabel}
        title={nextLabel}
        onClick={() => onPageChange(currentPage === 0 ? 1 : 0)}
      >
        <span className="preparaty__mini-tabs-nav-fade" aria-hidden="true" />
        <span className="preparaty__mini-tabs-nav-arrow" aria-hidden="true">
          {nextArrow}
        </span>
      </button>
    </div>
  );
}

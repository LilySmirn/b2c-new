import type { MiniCartAge, MiniCartVisit } from "../types";

type MiniCartMkbSearchProps = {
  query: string;
  open: boolean;
  visit: MiniCartVisit;
  age: MiniCartAge;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onVisitChange: (visit: MiniCartVisit) => void;
  onAgeChange: (age: MiniCartAge) => void;
  onSearch: () => void;
};

export default function MiniCartMkbSearch({
  query,
  open,
  visit,
  age,
  onQueryChange,
  onOpenChange,
  onVisitChange,
  onAgeChange,
  onSearch,
}: MiniCartMkbSearchProps) {
  return (
    <form
      className={`preparaty__mkb-search preparaty__mkb-search--mini${open ? " is-expanded" : ""}`}
      action="#"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onOpenChange(false);
        onSearch();
      }}
    >
      <div className="preparaty__mkb-search-row">
        <input
          className="preparaty__mkb-search-input"
          type="search"
          name="mkb-mini"
          value={query}
          placeholder="Код МКБ, например K26"
          maxLength={32}
          aria-label="Код МКБ для открытия справочника"
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => onOpenChange(true)}
        />
        <button
          type="submit"
          className="preparaty__mkb-search-btn"
          title="Открыть справочник"
          aria-label="Найти и открыть справочник"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mini-cart/search-mkb.svg" width={16} height={16} alt="" aria-hidden="true" />
        </button>
      </div>
      <div
        className="preparaty__mkb-search-filters"
        aria-hidden={open ? "false" : "true"}
      >
        <div
          className="preparaty__mini-nav preparaty__mkb-filter-nav"
          role="tablist"
          aria-label="Тип обращения"
        >
          {(
            [
              ["primary", "Первичный"],
              ["repeat", "Повторный"],
              ["inpatient", "Стационар"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`preparaty__mini-nav-btn${visit === id ? " is-active" : ""}`}
              role="tab"
              aria-selected={visit === id}
              onClick={() => onVisitChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="preparaty__mini-nav preparaty__mkb-filter-nav preparaty__mkb-filter-nav--age"
          role="tablist"
          aria-label="Возраст пациента"
        >
          {(
            [
              ["adult", "Взрослый"],
              ["child", "Ребенок"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`preparaty__mini-nav-btn${age === id ? " is-active" : ""}`}
              role="tab"
              aria-selected={age === id}
              onClick={() => onAgeChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

import {
  ageOptions,
  visitOptions,
  type AgeGroup,
  type VisitType,
} from "@/app/(directory)/shared/mkb";
import type { MiniCartAge, MiniCartVisit } from "../types";

type MiniCartMkbSearchProps = {
  query: string;
  open: boolean;
  visit: MiniCartVisit;
  age: MiniCartAge;
  disabledVisitIds?: readonly string[];
  disabledAgeIds?: readonly string[];
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onVisitChange: (visit: MiniCartVisit) => void;
  onAgeChange: (age: MiniCartAge) => void;
  onSearch: () => void;
  onInputFocus?: () => void;
};

export default function MiniCartMkbSearch({
  query,
  open,
  visit,
  age,
  disabledVisitIds = [],
  disabledAgeIds = [],
  onQueryChange,
  onOpenChange,
  onVisitChange,
  onAgeChange,
  onSearch,
  onInputFocus,
}: MiniCartMkbSearchProps) {
  return (
    <form
      className={`preparaty__mkb-search preparaty__mkb-search--mini${open ? " is-expanded" : ""}`}
      action="#"
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        onOpenChange(true);
        onSearch();
      }}
    >
      <div className="preparaty__mkb-search-row">
        <input
          className="preparaty__mkb-search-input notranslate"
          translate="no"
          type="search"
          name="mkb-mini"
          value={query}
          placeholder="Код МКБ, например K26"
          maxLength={32}
          aria-label="Код МКБ для открытия справочника"
          onChange={(event) => {
            onQueryChange(event.target.value);
            if (!open) onOpenChange(true);
          }}
          onFocus={() => {
            onOpenChange(true);
            onInputFocus?.();
          }}
        />
        <button
          type="submit"
          className="preparaty__mkb-search-btn"
          title="Открыть справочник"
          aria-label="Найти и открыть справочник"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mini-cart/search-mkb.svg"
            width={16}
            height={16}
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
      <div
        className="preparaty__mkb-search-filters"
        aria-hidden={open ? "false" : "true"}
        hidden={!open}
      >
        <div
          className="preparaty__mini-nav preparaty__mkb-filter-nav"
          role="tablist"
          aria-label="Тип обращения"
        >
          {visitOptions.map((option) => {
            const id = option.id as VisitType;
            const disabled = disabledVisitIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`preparaty__mini-nav-btn${visit === id ? " is-active" : ""}`}
                role="tab"
                aria-selected={visit === id}
                disabled={disabled}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (disabled) return;
                  onVisitChange(id);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div
          className="preparaty__mini-nav preparaty__mkb-filter-nav preparaty__mkb-filter-nav--age"
          role="tablist"
          aria-label="Возраст пациента"
        >
          {ageOptions.map((option) => {
            const id = option.id as AgeGroup;
            const disabled = disabledAgeIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`preparaty__mini-nav-btn${age === id ? " is-active" : ""}`}
                role="tab"
                aria-selected={age === id}
                disabled={disabled}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (disabled) return;
                  onAgeChange(id);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}

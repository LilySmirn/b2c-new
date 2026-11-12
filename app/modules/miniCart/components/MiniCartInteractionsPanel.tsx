import { displayName } from "../lib/display";
import type { MiniCartCatalogItem } from "../types";

type MiniCartInteractionsPanelProps = {
  selectedDrugs: MiniCartCatalogItem[];
  query: string;
  onQueryChange: (value: string) => void;
};

/**
 * Визуальный перенос вкладки взаимодействий.
 * Реальная проверка пар препаратов будет подключена на следующем этапе.
 */
export default function MiniCartInteractionsPanel({
  selectedDrugs,
  query,
  onQueryChange,
}: MiniCartInteractionsPanelProps) {
  return (
    <div className="preparaty__mini-ix">
      <div className="preparaty__mini-ix-search-wrap">
        <div className="preparaty__mkb-search-row preparaty__mini-ix-search-row">
          <input
            className="preparaty__mkb-search-input"
            type="search"
            name="mini-ix-query"
            placeholder="Дополнительный препарат (необязательно)…"
            maxLength={80}
            autoComplete="off"
            aria-label="Дополнительный препарат для проверки с выбранными"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </div>
      </div>
      <button type="button" className="preparaty__mini-ix-check">
        Проверить взаимодействия
      </button>
      <div className="preparaty__mini-ix-results" aria-live="polite">
        {selectedDrugs.length === 0 ? (
          <p className="preparaty__mini-ix-empty">
            Выберите препараты во вкладке «Клинические рекомендации» → «Препараты»,
            чтобы проверить взаимодействия.
          </p>
        ) : (
          <>
            <p className="preparaty__mini-ix-summary">
              Выбрано препаратов: {selectedDrugs.length}
            </p>
            <div className="preparaty__mini-ix-card is-ok">
              <div className="preparaty__mini-ix-card-head">
                <p className="preparaty__mini-ix-pair">
                  {selectedDrugs
                    .slice(0, 2)
                    .map((item) => displayName(item))
                    .join(" + ") || "Выбранные препараты"}
                </p>
              </div>
              <p className="preparaty__mini-ix-text">
                Визуальный прототип. Результаты проверки взаимодействий будут
                подключены к общим данным справочника на следующем этапе.
              </p>
              <p className="preparaty__mini-ix-foot">
                Источник: будет подключён к production-данным.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

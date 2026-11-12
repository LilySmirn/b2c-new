import type { MiniCartCatalogItem, MiniCartTradesBook } from "../types";

type MiniCartTradePopoverProps = {
  item: MiniCartCatalogItem;
  trades: MiniCartTradesBook;
  onClose: () => void;
  onPick: (pick: {
    inn: string;
    trade: string;
    dose?: string;
    form?: string;
  }) => void;
};

export default function MiniCartTradePopover({
  item,
  trades,
  onClose,
  onPick,
}: MiniCartTradePopoverProps) {
  const alternatives =
    item.kind === "alternatives"
      ? item.alternatives ?? []
      : item.inn
        ? [{ inn: item.inn, label: item.name }]
        : [];

  const inns =
    alternatives.length > 0
      ? alternatives
      : Object.keys(trades).map((inn) => ({
          inn,
          label: inn,
        }));

  return (
    <div className="preparaty__popover" role="listbox" aria-label="Торговые наименования">
      <div className="preparaty__popover-head">
        <strong>Выбор препарата</strong>
        <button type="button" aria-label="Закрыть" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="preparaty__popover-body">
        {inns.length === 0 ? (
          <p className="preparaty__empty">Нет вариантов в демо-данных.</p>
        ) : (
          inns.map((row) => {
            const book = trades[row.inn];
            const tradeRows = book?.trades ?? [];
            return (
              <div key={row.inn} className="preparaty__popover-group">
                <div className="preparaty__popover-group-title">{row.label || row.inn}</div>
                {tradeRows.length === 0 ? (
                  <button
                    type="button"
                    className="preparaty__popover-option"
                    onClick={() =>
                      onPick({
                        inn: row.inn,
                        trade: row.label || row.inn,
                      })
                    }
                  >
                    {row.label || row.inn}
                  </button>
                ) : (
                  tradeRows.map((trade) => {
                    const variant = trade.variants?.[0];
                    return (
                      <button
                        key={`${row.inn}-${trade.trade}`}
                        type="button"
                        className="preparaty__popover-option"
                        onClick={() =>
                          onPick({
                            inn: row.inn,
                            trade: trade.trade,
                            dose: variant?.dose,
                            form: variant?.form,
                          })
                        }
                      >
                        {trade.trade}
                        {variant?.dose || variant?.form ? (
                          <span>
                            {[variant?.dose, variant?.form].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

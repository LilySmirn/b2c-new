"use client";

import { useEffect, useState } from "react";
import { medsCatalogSession, type MedsCatalogSessionEntry } from "./medsCatalogSession";
import { EMPTY_MEDS_CATALOG, type MedsCatalogResponse } from "./medsCatalogTypes";

export type MedsCatalogView = {
  catalog: MedsCatalogResponse;
  query: { ids: readonly string[]; names: readonly string[] } | null;
  status: "idle" | "loading" | "ready" | "error";
};

const IDLE_VIEW: MedsCatalogView = {
  catalog: EMPTY_MEDS_CATALOG,
  query: null,
  status: "idle",
};

const viewFromEntry = (
  recommendationKey: string,
  entry: MedsCatalogSessionEntry | null,
): MedsCatalogView => {
  if (!entry || entry.recommendationKey !== recommendationKey) return IDLE_VIEW;

  if (entry.status !== "ready" || !entry.catalog) {
    return {
      catalog: EMPTY_MEDS_CATALOG,
      query: null,
      status: entry.status,
    };
  }

  return {
    catalog: entry.catalog,
    query: { ids: entry.ids, names: entry.names },
    status: "ready",
  };
};

/**
 * Читает справочник, который уже запрошен при выборе рекомендации.
 * Сам запрос не отправляет: вкладка, попап и повторный рендер его не запускают.
 */
export function useMedsCatalog(recommendationKey: string): MedsCatalogView {
  const [entry, setEntry] = useState<MedsCatalogSessionEntry | null>(() =>
    recommendationKey ? medsCatalogSession.read(recommendationKey) : null,
  );

  useEffect(() => {
    if (!recommendationKey) {
      setEntry(null);
      return;
    }

    const publish = () => setEntry(medsCatalogSession.read(recommendationKey));
    publish();

    return medsCatalogSession.subscribe(publish);
  }, [recommendationKey]);

  return viewFromEntry(recommendationKey, entry);
}

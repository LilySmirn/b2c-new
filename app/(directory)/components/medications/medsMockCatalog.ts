/**
 * Локальный справочник для `NEXT_PUBLIC_MEDS_SOURCE=mock`.
 * В режиме `real` этот модуль не импортируется: `resolveMeds` подгружает его
 * только когда явно выбран mock.
 */

import rawCatalog from "../../../../design/cart/meds-mock-cart-v5.json";
import { EMPTY_MEDS_CATALOG, type MedsCatalogEntry, type MedsCatalogResponse } from "./medsCatalogTypes";
import { normalizeMedsName, parseMedsCatalogResponse } from "./medsClient";

export let mockCatalogReads = 0;

const sourceCatalog = parseMedsCatalogResponse(rawCatalog) ?? EMPTY_MEDS_CATALOG;

const sameName = (left: string, right: string) =>
  normalizeMedsName(left) === normalizeMedsName(right);

const otherEntry = (name: string): MedsCatalogEntry => ({
  name,
  type: "other",
  data: [
    {
      name,
      items: [
        {
          standard_MNN: name,
          SMNN_code: "",
          standard_form: "",
          standard_dose: "",
          name_trade: "",
          code_ATC: "",
          name_unit: "",
        },
      ],
    },
  ],
});

const withRequestName = (entry: MedsCatalogEntry, name: string): MedsCatalogEntry => {
  if (entry.type === "combination") {
    return {
      name,
      type: "combination",
      combination_data: structuredClone(entry.combination_data),
    };
  }

  if (entry.type === "drug") {
    return { name, type: "drug", data: structuredClone(entry.data) };
  }

  if (entry.type === "group") {
    return { name, type: "group", data: structuredClone(entry.data) };
  }

  return { name, type: "other", data: structuredClone(entry.data) };
};

const findSourceEntry = (name: string) =>
  sourceCatalog.drugs.find((drug) => sameName(drug.name, name)) ?? null;

/**
 * Синхронная имитация ответа `POST /api/meds` из тестового JSON.
 * Пустой массив даёт пустой ответ. Порядок, число и повторы строк сохраняются.
 */
export const readMedsCatalog = (names: readonly string[] = []): MedsCatalogResponse => {
  mockCatalogReads += 1;
  if (names.length === 0) return EMPTY_MEDS_CATALOG;

  return {
    drugs: names.map((name) => {
      const found = findSourceEntry(name);
      return found ? withRequestName(found, name) : otherEntry(name);
    }),
    interactions: null,
  };
};

/**
 * Справочник препаратов для вкладки «Препараты».
 *
 * Единая точка — `resolveMeds`. В режиме `real` (по умолчанию) она отправляет
 * `POST /api/meds` с массивом исходных названий. Маршрут Next.js пересылает
 * этот массив на `POST https://easymed.pro/php/API/get-meds.php`.
 * В режиме `mock` записи берутся из `design/cart/meds-mock-cart-v5.json`.
 *
 * Ответ читается по `design/cart/API-meds (1).md`:
 * `drug`, `group` и `other` — через `data`, `combination` — через `combination_data`.
 * Строка с `++` не разбирается на клиенте: тип назначает сервер.
 * Ошибка сети не заменяется моковым ответом.
 *
 * Пока сервер не отдаёт тестовые схемы, `NEXT_PUBLIC_MEDS_COMBINATION_MOCK=true`
 * подставляет комбинацию из мока только если исходное название точно совпало
 * с известной тестовой комбинацией и сервер вернул `other`. Реальный
 * `combination`, `drug` и `group` не заменяются.
 */

import rawCatalog from "../../../../design/cart/meds-mock-cart-v5.json";
import { readMedsCombinationMock, readMedsSource, type MedsSource } from "./medsSource";
import { sortedRuLabels } from "./ruSort";
import {
  EMPTY_MEDS_CATALOG,
  EMPTY_MEDS_SELECTION,
  type MedsCatalogComponent,
  type MedsCatalogComponentType,
  type MedsCatalogDrug,
  type MedsCatalogEntry,
  type MedsCatalogInnGroup,
  type MedsCatalogItemRecord,
  type MedsCatalogResponse,
  type MedsNameMenu,
  type MedsRowSelection,
  type MedsRowView,
} from "./medsCatalogTypes";

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const readItem = (value: unknown): MedsCatalogItemRecord | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;

  return {
    standard_MNN: asString(row.standard_MNN),
    SMNN_code: asString(row.SMNN_code),
    standard_form: asString(row.standard_form),
    standard_dose: asString(row.standard_dose),
    name_trade: asString(row.name_trade),
    code_ATC: asString(row.code_ATC),
    name_unit: asString(row.name_unit),
  };
};

const readGroup = (value: unknown): MedsCatalogInnGroup | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !Array.isArray(row.items)) return null;

  const items = row.items.map(readItem);
  if (items.some((item) => item === null)) return null;

  return {
    name: row.name,
    items: items as MedsCatalogItemRecord[],
  };
};

const readGroups = (value: unknown): MedsCatalogInnGroup[] | null => {
  if (!Array.isArray(value)) return null;

  const groups = value.map(readGroup);
  if (groups.some((group) => group === null)) return null;

  return groups as MedsCatalogInnGroup[];
};

const isComponentType = (value: unknown): value is MedsCatalogComponentType =>
  value === "drug" || value === "group" || value === "other";

const readComponent = (value: unknown): MedsCatalogComponent | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !isComponentType(row.type)) return null;

  const data = readGroups(row.data);
  if (!data) return null;

  if (row.type === "drug") return { name: row.name, type: "drug", data };
  if (row.type === "group") return { name: row.name, type: "group", data };

  return { name: row.name, type: "other", data };
};

const readEntry = (value: unknown): MedsCatalogEntry | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string") return null;

  if (row.type === "combination") {
    if (!Array.isArray(row.combination_data)) return null;

    const combination = row.combination_data.map(readComponent);
    if (combination.some((item) => item === null)) return null;

    return {
      name: row.name,
      type: "combination",
      combination_data: combination as MedsCatalogComponent[],
    };
  }

  if (!isComponentType(row.type)) return null;

  return readComponent({ name: row.name, type: row.type, data: row.data });
};

export const parseMedsCatalogResponse = (value: unknown): MedsCatalogResponse | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as { drugs?: unknown; interactions?: unknown };
  if (!Array.isArray(source.drugs)) return null;
  if ("interactions" in source && source.interactions !== null) return null;

  const drugs = source.drugs.map(readEntry);
  if (drugs.some((drug) => drug === null)) return null;

  return {
    drugs: drugs as MedsCatalogEntry[],
    interactions: null,
  };
};

const sourceCatalog = parseMedsCatalogResponse(rawCatalog) ?? EMPTY_MEDS_CATALOG;

/** Пробелы схлопываются, сравнение без учёта регистра. Состав названия не угадывается. */
export const normalizeMedsName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");

const sameName = (left: string, right: string) =>
  normalizeMedsName(left) === normalizeMedsName(right);

const uniqueNames = (values: readonly string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((raw) => {
    const value = raw.trim();
    const key = normalizeMedsName(value);
    if (!key || seen.has(key)) return;

    seen.add(key);
    result.push(value);
  });

  return result;
};

const includesName = (options: readonly string[], value: string) =>
  options.some((option) => sameName(option, value));

const clearIncompatible = (
  value: string,
  previousOptions: readonly string[],
  nextOptions: readonly string[],
) => {
  if (!value.trim()) return "";
  if (!includesName(previousOptions, value)) return value;
  if (includesName(nextOptions, value)) return value;

  return "";
};

const itemsOf = (drug: MedsCatalogEntry | null) => {
  if (!drug || drug.type === "combination") return [];

  return drug.data.flatMap((group) => group.items);
};

const groupByInn = (
  drug: Extract<MedsCatalogEntry, { type: "group" }>,
  inn: string,
) => drug.data.find((group) => sameName(group.name, inn)) ?? null;

/** Записи выбранного МНН и, если торговое есть в каталоге, только этого торгового имени. */
const scopeItems = (drug: MedsCatalogEntry | null, inn: string, trade: string) => {
  if (!drug || drug.type === "other" || drug.type === "combination") return [];

  const items =
    drug.type === "group"
      ? inn.trim()
        ? (groupByInn(drug, inn)?.items ?? [])
        : []
      : itemsOf(drug);

  if (!trade.trim()) return items;

  const matched = items.filter((item) => sameName(item.name_trade, trade));
  return matched.length > 0 ? matched : items;
};

const filterByField = (
  items: readonly MedsCatalogItemRecord[],
  field: "standard_dose" | "standard_form",
  value: string,
) => {
  if (!value.trim()) return items;

  const matched = items.filter((item) => sameName(item[field], value));
  return matched.length > 0 ? matched : items;
};

const fieldValues = (
  items: readonly MedsCatalogItemRecord[],
  field: "standard_dose" | "standard_form" | "name_trade",
) => uniqueNames(items.map((item) => item[field]));

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

/** Целое название: пробелы схлопываются, регистр и знаки сохраняются. Состав не разбирается. */
const exactMedsName = (value: string) => value.trim().replace(/\s+/g, " ");

const knownMockCombinations = sourceCatalog.drugs.filter(
  (drug): drug is Extract<MedsCatalogEntry, { type: "combination" }> =>
    drug.type === "combination",
);

/**
 * Временная совместимость: `other` с точно известным тестовым названием
 * становится заранее описанной комбинацией. Остальные ответы не меняются.
 */
const applyKnownCombinationMock = (
  catalog: MedsCatalogResponse,
  names: readonly string[],
  enabled: boolean,
): MedsCatalogResponse => {
  if (!enabled) return catalog;

  let changed = false;
  const drugs = catalog.drugs.map((entry, index) => {
    if (entry.type !== "other") return entry;

    const requestedName = names[index] ?? entry.name;
    const key = exactMedsName(requestedName);
    const mock =
      knownMockCombinations.find((item) => exactMedsName(item.name) === key) ?? null;
    if (!mock) return entry;

    changed = true;
    return withRequestName(mock, requestedName);
  });

  if (!changed) return catalog;

  return { drugs, interactions: null };
};

/**
 * Синхронная имитация `POST /meds/resolve`.
 * Пустой массив даёт пустой ответ. Порядок, число и повторы строк сохраняются.
 */
export const readMedsCatalog = (names: readonly string[] = []): MedsCatalogResponse => {
  if (names.length === 0) return EMPTY_MEDS_CATALOG;

  return {
    drugs: names.map((name) => {
      const found = findSourceEntry(name);
      return found ? withRequestName(found, name) : otherEntry(name);
    }),
    interactions: null,
  };
};

/** Браузерный адрес. Апстрим вызывает только серверный маршрут `/api/meds`. */
export const MEDS_RESOLVE_PATH = "/api/meds";

const REAL_MEDS_TIMEOUT_MS = 35_000;

export type MedsResolveFailure = "network" | "timeout" | "http" | "invalid-json" | "invalid-shape";

export class MedsResolveError extends Error {
  readonly reason: MedsResolveFailure;
  readonly status: number | null;

  constructor(reason: MedsResolveFailure, message: string, status: number | null = null) {
    super(message);
    this.name = "MedsResolveError";
    this.reason = reason;
    this.status = status;
  }
}

export type ResolveMedsOptions = {
  source?: MedsSource;
  /** Временная подстановка известных тестовых комбинаций. По умолчанию читается из env. */
  combinationMock?: boolean;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
};

const isTimeout = (error: unknown) =>
  error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

const requestRealMeds = async (
  names: readonly string[],
  options: ResolveMedsOptions,
): Promise<MedsCatalogResponse> => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const payload = Array.from(names);
  let response: Response;

  try {
    response = await fetchImpl(options.endpoint ?? MEDS_RESOLVE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(options.timeoutMs ?? REAL_MEDS_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = isTimeout(error);
    throw new MedsResolveError(
      timedOut ? "timeout" : "network",
      timedOut ? "Meds catalog request timed out" : "Meds catalog request failed",
    );
  }

  if (!response.ok) {
    throw new MedsResolveError(
      "http",
      `Meds catalog request failed with HTTP ${response.status}`,
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new MedsResolveError(
      "invalid-json",
      "Meds catalog response is not JSON",
      response.status,
    );
  }

  const catalog = parseMedsCatalogResponse(body);
  if (!catalog || catalog.drugs.length !== payload.length) {
    throw new MedsResolveError(
      "invalid-shape",
      "Meds catalog response does not match the request",
      response.status,
    );
  }

  return catalog;
};

/**
 * Единая точка получения справочника.
 * `real` отправляет исходные названия методом POST. `mock` читает локальный JSON.
 * Режимы не подменяют друг друга. Ошибочный ответ real не заменяется моком.
 * Временная комбинация подставляется только после успешного разбора `other`.
 */
export const resolveMeds = async (
  names: readonly string[] = [],
  options: ResolveMedsOptions = {},
): Promise<MedsCatalogResponse> => {
  const source = options.source ?? readMedsSource();
  if (source === "mock") return readMedsCatalog(names);

  const catalog = await requestRealMeds(names, options);
  return applyKnownCombinationMock(
    catalog,
    names,
    options.combinationMock ?? readMedsCombinationMock(),
  );
};

export const matchMedsDrug = (
  catalog: MedsCatalogResponse,
  prescriptionName: string,
): MedsCatalogDrug | null => {
  const key = normalizeMedsName(prescriptionName);
  if (!key) return null;

  return catalog.drugs.find((drug) => sameName(drug.name, prescriptionName)) ?? null;
};

/** Связывает строку назначения с ответом по позиции запроса, а не только по названию. */
export const matchMedsDrugForItem = (
  catalog: MedsCatalogResponse,
  query: { ids: readonly string[]; names: readonly string[] } | null,
  item: { id: string; title: string; sourceIds?: readonly string[] },
): MedsCatalogDrug | null => {
  if (
    query &&
    query.ids.length === catalog.drugs.length &&
    query.names.length === catalog.drugs.length
  ) {
    const wanted = new Set([item.id, ...(item.sourceIds ?? [])]);
    const index = query.ids.findIndex((id) => wanted.has(id));
    if (index >= 0) return catalog.drugs[index] ?? null;
  }

  return matchMedsDrug(catalog, item.title);
};

export const listMedsInns = (drug: MedsCatalogDrug | null) => {
  if (!drug || drug.type !== "group") return [];

  return sortedRuLabels(uniqueNames(drug.data.map((group) => group.name)));
};

export const listMedsTrades = (drug: MedsCatalogDrug | null, inn: string) => {
  if (!drug || drug.type === "other" || drug.type === "combination") return [];

  if (drug.type === "group") {
    if (!inn.trim()) return [];

    return sortedRuLabels(fieldValues(groupByInn(drug, inn)?.items ?? [], "name_trade"));
  }

  return sortedRuLabels(fieldValues(itemsOf(drug), "name_trade"));
};

export const listMedsDoses = (
  drug: MedsCatalogDrug | null,
  selection: Pick<MedsRowSelection, "inn" | "trade" | "form">,
) =>
  fieldValues(
    filterByField(scopeItems(drug, selection.inn, selection.trade), "standard_form", selection.form),
    "standard_dose",
  );

export const listMedsForms = (
  drug: MedsCatalogDrug | null,
  selection: Pick<MedsRowSelection, "inn" | "trade" | "dose">,
) =>
  fieldValues(
    filterByField(scopeItems(drug, selection.inn, selection.trade), "standard_dose", selection.dose),
    "standard_form",
  );

const resolveRecordId = (
  drug: MedsCatalogDrug | null,
  selection: Pick<MedsRowSelection, "inn" | "trade" | "dose" | "form">,
) => {
  if (!drug || drug.type === "other" || drug.type === "combination") return "";
  if (!selection.trade.trim() || !selection.dose.trim() || !selection.form.trim()) return "";

  const pool = drug.type === "group" ? (groupByInn(drug, selection.inn)?.items ?? []) : itemsOf(drug);
  const matched = pool.filter(
    (item) =>
      sameName(item.name_trade, selection.trade) &&
      sameName(item.standard_dose, selection.dose) &&
      sameName(item.standard_form, selection.form),
  );

  if (matched.length !== 1) return "";

  return matched[0].SMNN_code.trim();
};

const catalogInnForTrade = (
  drug: Extract<MedsCatalogEntry, { type: "drug" }>,
  trade: string,
) =>
  drug.data.find((group) => group.items.some((item) => sameName(item.name_trade, trade)))?.name ??
  "";

export const applyMedsSelection = (
  drug: MedsCatalogDrug | null,
  current: MedsRowSelection,
  patch: Partial<Pick<MedsRowSelection, "inn" | "trade" | "dose" | "form">>,
): MedsRowSelection => {
  const previousInn = current.inn;
  const previousTrade = current.trade;
  let inn = patch.inn ?? current.inn;
  let trade = patch.trade ?? current.trade;
  let dose = patch.dose ?? current.dose;
  let form = patch.form ?? current.form;

  if (!drug || drug.type === "other" || drug.type === "combination") {
    return { inn, trade, dose, form, recordId: "" };
  }

  if (drug.type === "drug" && patch.trade !== undefined) {
    inn =
      patch.trade.trim() && includesName(listMedsTrades(drug, ""), patch.trade)
        ? catalogInnForTrade(drug, patch.trade)
        : "";
  }

  if (drug.type === "group" && patch.inn !== undefined && !sameName(inn, previousInn)) {
    trade = clearIncompatible(trade, listMedsTrades(drug, previousInn), listMedsTrades(drug, inn));
  }

  const contextChanged = !sameName(inn, previousInn) || !sameName(trade, previousTrade);
  const doseChanged = patch.dose !== undefined && !sameName(patch.dose, current.dose);
  const formChanged = patch.form !== undefined && !sameName(patch.form, current.form);
  const previousScope = scopeItems(drug, previousInn, previousTrade);
  const nextScope = scopeItems(drug, inn, trade);

  if (contextChanged) {
    dose = clearIncompatible(
      dose,
      fieldValues(previousScope, "standard_dose"),
      fieldValues(nextScope, "standard_dose"),
    );
    form = clearIncompatible(
      form,
      fieldValues(previousScope, "standard_form"),
      fieldValues(filterByField(nextScope, "standard_dose", dose), "standard_form"),
    );
  } else if (doseChanged) {
    form = clearIncompatible(
      form,
      fieldValues(nextScope, "standard_form"),
      fieldValues(filterByField(nextScope, "standard_dose", dose), "standard_form"),
    );
  } else if (formChanged) {
    dose = clearIncompatible(
      dose,
      fieldValues(nextScope, "standard_dose"),
      fieldValues(filterByField(nextScope, "standard_form", form), "standard_dose"),
    );
  }

  return {
    inn,
    trade,
    dose,
    form,
    recordId: resolveRecordId(drug, { inn, trade, dose, form }),
  };
};

const catalogLabelFor = (drug: MedsCatalogDrug | null, selection: MedsRowSelection) => {
  const parts = drug?.type === "group" ? [selection.inn, selection.trade] : [selection.trade];

  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" · ");
};

export const buildMedsRowView = (
  drug: MedsCatalogDrug | null,
  selection: MedsRowSelection = EMPTY_MEDS_SELECTION,
): MedsRowView => {
  const inns = listMedsInns(drug);
  const trades = listMedsTrades(drug, drug?.type === "group" ? selection.inn : "");
  let nameMenu: MedsNameMenu | null = null;

  if (drug?.type === "group" && inns.length > 0) {
    nameMenu = {
      mode: "group",
      inns,
      trades,
      selectedInn: selection.inn,
      selectedTrade: selection.trade,
    };
  } else if (drug?.type === "drug" && trades.length > 0) {
    nameMenu = {
      mode: "drug",
      trades,
      selectedTrade: selection.trade,
    };
  }

  return {
    nameMenu,
    doseOptions: listMedsDoses(drug, selection),
    formOptions: listMedsForms(drug, selection),
    catalogLabel: catalogLabelFor(drug, selection),
  };
};

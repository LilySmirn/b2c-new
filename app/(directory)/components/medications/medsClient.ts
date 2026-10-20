/**
 * Справочник препаратов для вкладки «Препараты».
 *
 * Сейчас источник — локальный `design/cart/meds-mock-cart.json`.
 * Компоненты не импортируют JSON и не знают, мок это или сеть.
 *
 * Чтобы подключить реальный API, замените `resolveMeds` на
 * `POST https://apimock.com/meds/resolve` с телом `string[]`
 * и ответом `MedsCatalogResponse` из `API-meds.md`.
 * `readMedsCatalog` при этом может возвращать пустой каталог,
 * пока ответ сети не пришёл. Разбор полей ниже менять не нужно.
 */

import rawCatalog from "../../../../design/cart/meds-mock-cart.json";
import {
  EMPTY_MEDS_SELECTION,
  type MedsCatalogDrug,
  type MedsCatalogInnGroup,
  type MedsCatalogItemRecord,
  type MedsCatalogItemType,
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

  return {
    name: row.name,
    items: row.items.flatMap((item) => {
      const record = readItem(item);
      return record ? [record] : [];
    }),
  };
};

const isCatalogType = (value: unknown): value is MedsCatalogItemType =>
  value === "drug" || value === "group" || value === "other";

const readDrug = (value: unknown): MedsCatalogDrug | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (typeof row.name !== "string" || !isCatalogType(row.type) || !Array.isArray(row.data)) {
    return null;
  }

  return {
    name: row.name,
    type: row.type,
    data: row.data.flatMap((group) => {
      const record = readGroup(group);
      return record ? [record] : [];
    }),
  };
};

const readCatalog = (value: unknown): MedsCatalogResponse => {
  const source = value && typeof value === "object" ? (value as { drugs?: unknown }) : {};
  const drugs = Array.isArray(source.drugs)
    ? source.drugs.flatMap((drug) => {
        const record = readDrug(drug);
        return record ? [record] : [];
      })
    : [];

  return { drugs, interactions: null };
};

const mockCatalog = readCatalog(rawCatalog);

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

const itemsOf = (drug: MedsCatalogDrug | null) =>
  drug ? drug.data.flatMap((group) => group.items) : [];

const groupByInn = (drug: MedsCatalogDrug, inn: string) =>
  drug.data.find((group) => sameName(group.name, inn)) ?? null;

/** Записи выбранного МНН и, если торговое есть в каталоге, только этого торгового имени. */
const scopeItems = (drug: MedsCatalogDrug | null, inn: string, trade: string) => {
  if (!drug || drug.type === "other") return [];

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

export const readMedsCatalog = (names: readonly string[] = []): MedsCatalogResponse => {
  if (names.length === 0) return mockCatalog;

  const seen = new Set<string>();
  const drugs: MedsCatalogDrug[] = [];

  names.forEach((name) => {
    const drug = matchMedsDrug(mockCatalog, name);
    if (!drug) return;

    const key = normalizeMedsName(drug.name);
    if (seen.has(key)) return;

    seen.add(key);
    drugs.push(drug);
  });

  return { drugs, interactions: null };
};

/**
 * Единая точка получения справочника.
 * Сейчас сразу отдаёт локальный JSON. Позже здесь будет запрос к API.
 */
export const resolveMeds = (names: readonly string[] = []): Promise<MedsCatalogResponse> =>
  Promise.resolve(readMedsCatalog(names));

export const matchMedsDrug = (
  catalog: MedsCatalogResponse,
  prescriptionName: string,
): MedsCatalogDrug | null => {
  const key = normalizeMedsName(prescriptionName);
  if (!key) return null;

  return catalog.drugs.find((drug) => sameName(drug.name, prescriptionName)) ?? null;
};

export const listMedsInns = (drug: MedsCatalogDrug | null) => {
  if (!drug || drug.type !== "group") return [];

  return uniqueNames(drug.data.map((group) => group.name));
};

export const listMedsTrades = (drug: MedsCatalogDrug | null, inn: string) => {
  if (!drug || drug.type === "other") return [];

  if (drug.type === "group") {
    if (!inn.trim()) return [];

    return fieldValues(groupByInn(drug, inn)?.items ?? [], "name_trade");
  }

  return fieldValues(itemsOf(drug), "name_trade");
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
  if (!drug || drug.type === "other") return "";
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

const catalogInnForTrade = (drug: MedsCatalogDrug, trade: string) =>
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

  if (!drug || drug.type === "other") {
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

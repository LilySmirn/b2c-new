/**
 * Контракт справочника препаратов из `design/cart/API-meds.md`.
 * Сейчас данные читает `medsClient.ts` из локального JSON.
 * В этом ответе нет КК, уровня рекомендаций, описания, схемы и курса.
 */

export type MedsCatalogItemType = "drug" | "group" | "other";

export type MedsCatalogItemRecord = {
  standard_MNN: string;
  SMNN_code: string;
  standard_form: string;
  standard_dose: string;
  name_trade: string;
  code_ATC: string;
  name_unit: string;
};

export type MedsCatalogInnGroup = {
  name: string;
  items: MedsCatalogItemRecord[];
};

export type MedsCatalogDrug = {
  name: string;
  type: MedsCatalogItemType;
  data: MedsCatalogInnGroup[];
};

export type MedsCatalogResponse = {
  drugs: MedsCatalogDrug[];
  interactions: null;
};

export type MedsCatalogFieldOptions = {
  doses: readonly string[];
  forms: readonly string[];
};

/** Выбор пользователя по одной строке таблицы. Не меняет название клинической рекомендации. */
export type MedsRowSelection = {
  inn: string;
  trade: string;
  dose: string;
  form: string;
  recordId: string;
};

export type MedsNameMenu =
  | {
      mode: "drug";
      trades: readonly string[];
      selectedTrade: string;
    }
  | {
      mode: "group";
      inns: readonly string[];
      trades: readonly string[];
      selectedInn: string;
      selectedTrade: string;
    };

export type MedsRowView = {
  nameMenu: MedsNameMenu | null;
  doseOptions: readonly string[];
  formOptions: readonly string[];
  catalogLabel: string;
};

export const EMPTY_MEDS_SELECTION: MedsRowSelection = {
  inn: "",
  trade: "",
  dose: "",
  form: "",
  recordId: "",
};

const uniqueValues = (values: readonly string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)),
  );

/** Пустые строки каталога не становятся вариантами дозы или формы. */
export const fieldOptionsFromCatalogItems = (
  items: readonly MedsCatalogItemRecord[],
): MedsCatalogFieldOptions => ({
  doses: uniqueValues(items.map((item) => item.standard_dose)),
  forms: uniqueValues(items.map((item) => item.standard_form)),
});

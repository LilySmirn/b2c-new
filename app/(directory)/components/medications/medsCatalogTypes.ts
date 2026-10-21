/**
 * Контракт справочника препаратов из `design/cart/API-meds (1).md`.
 * Ответ читает `medsClient.ts`. В нём нет КК, уровня рекомендаций,
 * описания, схемы и курса.
 */

export type MedsCatalogComponentType = "drug" | "group" | "other";

export type MedsCatalogItemType = MedsCatalogComponentType | "combination";

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

/** Вложенный компонент комбинации. Сам тип `combination` сюда не входит. */
export type MedsCatalogComponent =
  | {
      name: string;
      type: "drug";
      data: MedsCatalogInnGroup[];
    }
  | {
      name: string;
      type: "group";
      data: MedsCatalogInnGroup[];
    }
  | {
      name: string;
      type: "other";
      data: MedsCatalogInnGroup[];
    };

export type MedsCatalogEntry =
  | {
      name: string;
      type: "drug";
      data: MedsCatalogInnGroup[];
    }
  | {
      name: string;
      type: "group";
      data: MedsCatalogInnGroup[];
    }
  | {
      name: string;
      type: "other";
      data: MedsCatalogInnGroup[];
    }
  | {
      name: string;
      type: "combination";
      combination_data: MedsCatalogComponent[];
    };

export type MedsCatalogDrug = MedsCatalogEntry;

export type MedsCatalogResponse = {
  drugs: MedsCatalogEntry[];
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

export const EMPTY_MEDS_CATALOG: MedsCatalogResponse = {
  drugs: [],
  interactions: null,
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

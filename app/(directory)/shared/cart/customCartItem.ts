/**
 * Пользовательские позиции корзины: услуга («Прочее») и медикамент («Лечение»).
 * Старые записи без kind считаются услугами.
 */

export type CustomCartItemKind = "service" | "drug";
export type CustomCartItemSource = "catalog" | "manual";

export type StoredCustomCartItem = {
  id: string;
  name: string;
  comment: string;
  kind?: CustomCartItemKind;
  inn?: string;
  trade?: string;
  smnnCode?: string;
  dose?: string;
  form?: string;
  source?: CustomCartItemSource;
};

export type CustomCartItemValues = {
  name: string;
  comment: string;
  kind?: CustomCartItemKind;
  inn?: string;
  trade?: string;
  smnnCode?: string;
  dose?: string;
  form?: string;
  source?: CustomCartItemSource;
};

/** Кандидат поиска (контракт будущего /api/meds/search). */
export type DrugSearchHit =
  | {
      type: "inn";
      inn: string;
      label: string;
      hint?: string;
    }
  | {
      type: "trade";
      inn: string;
      trade: string;
      label: string;
      hint?: string;
      dose?: string;
      form?: string;
      smnnCode?: string;
    };

export type DrugTradeOption = {
  trade: string;
  dose?: string;
  form?: string;
  smnnCode?: string;
};

export const CUSTOM_ITEM_NAME_MAX_LENGTH = 160;
export const CUSTOM_ITEM_COMMENT_MAX_LENGTH = 500;

export const getCustomCartItemKind = (
  item: Pick<StoredCustomCartItem, "kind"> | null | undefined,
): CustomCartItemKind => (item?.kind === "drug" ? "drug" : "service");

export const isCustomDrugItem = (
  item: Pick<StoredCustomCartItem, "kind"> | null | undefined,
) => getCustomCartItemKind(item) === "drug";

export const isCustomServiceItem = (
  item: Pick<StoredCustomCartItem, "kind"> | null | undefined,
) => getCustomCartItemKind(item) === "service";

export const capitalizeCustomCartItemName = (value: string) => {
  const [firstLetter = "", ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("ru")}${restLetters.join("")}`;
};

const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asKind = (value: unknown): CustomCartItemKind | undefined =>
  value === "drug" || value === "service" ? value : undefined;

const asSource = (value: unknown): CustomCartItemSource | undefined =>
  value === "catalog" || value === "manual" ? value : undefined;

/**
 * Нормализация записи из storage / шаблона.
 * Неизвестные поля отбрасываются; отсутствующий kind → поведение услуги.
 */
export const normalizeStoredCustomCartItem = (
  value: unknown,
): StoredCustomCartItem | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;

  const kind = asKind(row.kind);
  const comment = typeof row.comment === "string" ? row.comment : "";

  if (kind === "drug") {
    return {
      id: row.id,
      name: row.name,
      comment,
      kind: "drug",
      inn: asOptionalString(row.inn),
      trade: asOptionalString(row.trade),
      smnnCode: asOptionalString(row.smnnCode),
      dose: asOptionalString(row.dose),
      form: asOptionalString(row.form),
      source: asSource(row.source) ?? "manual",
    };
  }

  return {
    id: row.id,
    name: row.name,
    comment,
    ...(kind === "service" ? { kind: "service" as const } : {}),
  };
};

export const buildStoredCustomCartItem = (
  id: string,
  values: CustomCartItemValues,
): StoredCustomCartItem => {
  const name = values.name.trim();
  const comment = values.comment.trim();
  const kind = values.kind === "drug" ? "drug" : "service";

  if (kind === "drug") {
    return {
      id,
      name,
      comment,
      kind: "drug",
      inn: asOptionalString(values.inn),
      trade: asOptionalString(values.trade),
      smnnCode: asOptionalString(values.smnnCode),
      dose: asOptionalString(values.dose),
      form: asOptionalString(values.form),
      source: values.source === "catalog" ? "catalog" : "manual",
    };
  }

  return { id, name, comment, kind: "service" };
};

/** Обновление name/comment без потери kind/inn/trade и прочих полей. */
export const mergeCustomCartItemValues = (
  item: StoredCustomCartItem,
  values: Pick<CustomCartItemValues, "name" | "comment"> &
    Partial<CustomCartItemValues>,
): StoredCustomCartItem => {
  if (values.kind === "drug" || values.kind === "service") {
    return buildStoredCustomCartItem(item.id, {
      ...item,
      ...values,
      name: values.name,
      comment: values.comment,
      kind: values.kind,
    });
  }

  return {
    ...item,
    name: values.name.trim(),
    comment: values.comment.trim(),
  };
};

export const sameCustomCartItems = (
  left: readonly StoredCustomCartItem[],
  right: readonly StoredCustomCartItem[],
) => {
  if (left.length !== right.length) return false;

  return left.every((item, index) => {
    const other = right[index];
    if (!other) return false;

    return (
      item.id === other.id &&
      item.name === other.name &&
      item.comment === other.comment &&
      getCustomCartItemKind(item) === getCustomCartItemKind(other) &&
      (item.inn ?? "") === (other.inn ?? "") &&
      (item.trade ?? "") === (other.trade ?? "") &&
      (item.smnnCode ?? "") === (other.smnnCode ?? "") &&
      (item.dose ?? "") === (other.dose ?? "") &&
      (item.form ?? "") === (other.form ?? "") &&
      (item.source ?? "") === (other.source ?? "")
    );
  });
};

/**
 * Правила пользовательских позиций — как в CustomCartItemModal / SideCart.
 * Чистые функции для формы мини-корзинки и тестов.
 */

export const CUSTOM_ITEM_NAME_MAX_LENGTH = 160;
export const CUSTOM_ITEM_COMMENT_MAX_LENGTH = 500;

export type CustomItemValues = {
  name: string;
  comment: string;
};

export type StoredCustomItemLike = {
  id: string;
  name: string;
  comment: string;
};

export const capitalizeCustomItemName = (value: string) => {
  const [firstLetter = "", ...restLetters] = Array.from(value);
  return `${firstLetter.toLocaleUpperCase("ru")}${restLetters.join("")}`;
};

export const validateCustomItemName = (name: string): string => {
  const trimmedName = name.trim();

  if (!trimmedName) return "Укажите название услуги или медикамента";
  if (trimmedName.length > CUSTOM_ITEM_NAME_MAX_LENGTH) {
    return `Название не должно быть длиннее ${CUSTOM_ITEM_NAME_MAX_LENGTH} символов`;
  }

  return "";
};

export const normalizeCustomItemValues = (values: {
  name: string;
  comment: string;
}): CustomItemValues | null => {
  if (validateCustomItemName(values.name)) return null;

  return {
    name: capitalizeCustomItemName(values.name.trim()),
    comment: values.comment.trim(),
  };
};

export const addCustomItemToList = <T extends StoredCustomItemLike>(
  items: readonly T[],
  item: T,
): T[] => [...items, item];

export const updateCustomItemInList = <T extends StoredCustomItemLike>(
  items: readonly T[],
  id: string,
  values: CustomItemValues,
): T[] =>
  items.map((item) =>
    item.id === id ? { ...item, name: values.name, comment: values.comment } : item,
  );

export const removeCustomItemFromList = <T extends StoredCustomItemLike>(
  items: readonly T[],
  id: string,
): T[] => items.filter((item) => item.id !== id);

/**
 * Правила пользовательских позиций — как в CustomCartItemModal / SideCart.
 * Чистые функции для формы мини-корзинки и тестов.
 */

import {
  capitalizeCustomCartItemName,
  CUSTOM_ITEM_COMMENT_MAX_LENGTH,
  CUSTOM_ITEM_NAME_MAX_LENGTH,
  mergeCustomCartItemValues,
  type StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";

export {
  CUSTOM_ITEM_COMMENT_MAX_LENGTH,
  CUSTOM_ITEM_NAME_MAX_LENGTH,
};

export type CustomItemValues = {
  name: string;
  comment: string;
};

export type StoredCustomItemLike = StoredCustomCartItem;

export const capitalizeCustomItemName = capitalizeCustomCartItemName;

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

/**
 * Обновляет name/comment, сохраняя kind/inn/trade и прочие поля модели.
 */
export const updateCustomItemInList = <T extends StoredCustomItemLike>(
  items: readonly T[],
  id: string,
  values: CustomItemValues,
): T[] =>
  items.map((item) =>
    item.id === id
      ? (mergeCustomCartItemValues(item, values) as T)
      : item,
  );

export const removeCustomItemFromList = <T extends StoredCustomItemLike>(
  items: readonly T[],
  id: string,
): T[] => items.filter((item) => item.id !== id);

import type { SelectedPrescription } from "./PrescriptionChecklist";
import type { StoredCustomCartItem } from "@/app/(directory)/shared/cart";

export const CART_TEMPLATES_STORAGE_KEY = "directoryCartTemplatesDraft";

export type CartTemplateCustomItem = StoredCustomCartItem;

export type CartTemplate = {
  id: string;
  name: string;
  author: string;
  createdAt: string;
  diagnosisCode: string;
  recommendationTitle?: string;
  generalComment?: string;
  doctorComments: string[];
  items: SelectedPrescription[];
  customItems?: CartTemplateCustomItem[];
};

export const readCartTemplates = (): CartTemplate[] => {
  const storedValue = window.localStorage.getItem(CART_TEMPLATES_STORAGE_KEY);

  if (!storedValue) return [];

  try {
    const parsedTemplates = JSON.parse(storedValue);
    return Array.isArray(parsedTemplates) ? parsedTemplates : [];
  } catch {
    return [];
  }
};

export const writeCartTemplates = (templates: CartTemplate[]) => {
  window.localStorage.setItem(
    CART_TEMPLATES_STORAGE_KEY,
    JSON.stringify(templates),
  );
};

export const deleteCartTemplate = (templateId: string) => {
  writeCartTemplates(
    readCartTemplates().filter((template) => template.id !== templateId),
  );
};
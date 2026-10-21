export type MedicationQuerySource = {
  categoryId: string;
  items: readonly { id: string; title: string }[];
};

/**
 * Названия строк «Препараты» в исходном порядке.
 * Повторы сохраняются: одинаковые названия остаются разными элементами запроса.
 */
export const collectMedicationQuery = (sections: readonly MedicationQuerySource[]) => {
  const items = sections.flatMap((section) =>
    section.categoryId === "medications" ? section.items : [],
  );

  return {
    ids: items.map((item) => item.id),
    names: items.map((item) => item.title),
  };
};

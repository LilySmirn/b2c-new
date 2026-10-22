/** Сортировка подписей для показа. Исходный массив не меняется. */
export const compareRu = (left: string, right: string) => left.localeCompare(right, "ru");

export const sortedRuLabels = (labels: readonly string[]) =>
  labels
    .map((label, index) => ({ label, index }))
    .sort((left, right) => {
      const byLabel = compareRu(left.label, right.label);
      return byLabel !== 0 ? byLabel : left.index - right.index;
    })
    .map((entry) => entry.label);

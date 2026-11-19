import type { AgeGroup, FilterAvailability, VisitType } from "./types";

export const visitOptions = [
  { id: "primary" as const, label: "Первичный" },
  { id: "repeat" as const, label: "Повторный" },
  { id: "inpatient" as const, label: "Стационар" },
];

export const ageOptions = [
  { id: "adult" as const, label: "Взрослый" },
  { id: "child" as const, label: "Ребёнок" },
];

export const isVisitType = (value: unknown): value is VisitType =>
  typeof value === "string" &&
  visitOptions.some((option) => option.id === value);

export const isAgeGroup = (value: unknown): value is AgeGroup =>
  typeof value === "string" && ageOptions.some((option) => option.id === value);

export const hasDataForFilters = (
  availability: FilterAvailability,
  age: AgeGroup,
  visit: VisitType,
) => availability[age][visit];

export const getAvailableFilters = (
  availability: FilterAvailability,
  preferredAge: AgeGroup,
  preferredVisit: VisitType,
) => {
  if (hasDataForFilters(availability, preferredAge, preferredVisit)) {
    return { age: preferredAge, visit: preferredVisit };
  }

  const fallbackCandidates = [
    {
      age: (preferredAge === "adult" ? "child" : "adult") as AgeGroup,
      visit: preferredVisit,
    },
    ...visitOptions.map((visitOption) => ({
      age: preferredAge,
      visit: visitOption.id as VisitType,
    })),
    ...ageOptions.flatMap((ageOption) =>
      visitOptions.map((visitOption) => ({
        age: ageOption.id as AgeGroup,
        visit: visitOption.id as VisitType,
      })),
    ),
  ];

  return fallbackCandidates.find(({ age, visit }) =>
    hasDataForFilters(availability, age, visit),
  );
};

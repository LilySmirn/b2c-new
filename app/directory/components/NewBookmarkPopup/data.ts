import { testRecommendationTitle } from "@/app/directory/components/recommendationTestTitle";

export const newBookmarkVisitOptions = [
  { id: "primary", label: "Первичный" },
  { id: "repeat", label: "Повторный" },
  { id: "inpatient", label: "Стационар" },
];

export const newBookmarkAgeOptions = [
  { id: "adult", label: "Взрослый" },
  { id: "child", label: "Ребёнок" },
];

export const newBookmarkRecommendationTitles = [
  testRecommendationTitle,
  "Язвенная болезнь",
  "Эзофагит",
  "Гастроэзофагеальный рефлюкс",
];

export const newBookmarkRecommendationCardData = {
  externalUrl: "https://cr.minzdrav.gov.ru/",
  standardId: "277_2",
  status: "Действует",
  ageCategory: "Взрослые",
  publicationDate: "13.01.2025",
  approvalYear: "2024",
  classification: "K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0",
};
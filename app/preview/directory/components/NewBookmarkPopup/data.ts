import { testRecommendationTitle } from "@/app/preview/directory/components/recommendationTestTitle";

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
  idLabel: "ID:",
  idValue: "277_2",
  statusLabel: "Статус:",
  statusValue: "Действует",
  ageCategoryLabel: "Возрастная категория:",
  ageCategoryValue: "Взрослые",
  publicationDateLabel: "Дата размещения КР:",
  publicationDateValue: "13.01.2025",
  approvalYearLabel: "Год утверждения:",
  approvalYearValue: "2024",
  classificationLabel:
    "Кодирование по международной статистической классификации болезней и проблем, связанных со здоровьем:",
  classificationValue:
    "K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0, K25, K26, K27.0",
};
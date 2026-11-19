export type MkbSearchResult = {
  code: string;
  name: string;
};

export type AgeGroup = "adult" | "child";
export type VisitType = "primary" | "repeat" | "inpatient";
export type FilterAvailability = Record<AgeGroup, Record<VisitType, boolean>>;

export type MkbRecommendationsResponse = {
  child: MkbSearchResult[];
  grownup: MkbSearchResult[];
};

export type ChecklistSection = {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle?: string;
  groupTitle: string;
  items: {
    id: string;
    checked: boolean;
    qualityControl: boolean;
    code: string;
    title: string;
    info: string;
    comment: string;
    infoComment?: string;
  }[];
};

export type RecommendationStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  dateApprovement: string;
  dateReview: string;
  ageCategory: string;
  prescriptions: ChecklistSection[];
};

export type StandardsByFilters = Record<
  AgeGroup,
  Record<VisitType, RecommendationStandard[]>
>;

export type MkbDataResponse = {
  availability: FilterAvailability;
  recommendations: MkbRecommendationsResponse;
  standards: StandardsByFilters;
};

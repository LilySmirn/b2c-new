import { NextResponse } from "next/server";

const EASYMED_MKB_URL = "https://easymed.pro/php/API/get-mkb.php";
const EASYMED_MKB_CR_URL = "https://easymed.pro/php/API/get-mkb-cr.php";
const EASYMED_CR_TEXT_URL = "https://easymed.pro/php/API/get-cr-text.php";
const EASYMED_USERNAME = process.env.EASYMED_API_USERNAME ?? "testAPI";
const EASYMED_PASSWORD = process.env.EASYMED_API_PASSWORD ?? "w_SfRR!2kd";

type AgeGroup = "adult" | "child";
type VisitType = "primary" | "repeat" | "inpatient";
type FilterAvailability = Record<AgeGroup, Record<VisitType, boolean>>;

type EasyMedPers = {
  уур?: unknown;
  удд?: unknown;
};

type EasyMedAppointment = {
  name?: unknown;
  comment?: unknown;
  stage?: number | string | null;
  is_required?: number | string | null;
  category_name?: unknown;
  is_qualitative?: number | string | null;
  is_stationary?: number | string | null;
  cr_db_id?: unknown;
  S_CODE?: unknown;
  pers?: EasyMedPers | null;
  plan?: unknown;
  duration?: unknown;
  type?: unknown;
  SMNN_CODE?: unknown;
};

type EasyMedStandard = {
  cr_m_id?: unknown;
  mkb_codes?: unknown;
  name?: unknown;
  status?: unknown;
  cr_source?: unknown;
  examinations?: EasyMedAppointment[];
  treatments?: EasyMedAppointment[];
};

type EasyMedBranch = {
  standards?: unknown;
};

type EasyMedMkbResponse = {
  child?: unknown;
  grownup?: unknown;
};

type EasyMedMkbRecommendation = {
  code?: unknown;
  name?: unknown;
};

type RecommendationsResponse = {
  child?: unknown;
  grownup?: unknown;
};

type EasyMedCrTextItem = {
  cr_db_id?: unknown;
  value?: {
    text?: unknown;
    comment?: unknown;
  } | null;
};

type CrTextById = Record<string, { text: string; comment: string }>;

type PrescriptionItem = {
  id: string;
  checked: boolean;
  qualityControl: boolean;
  code: string;
  title: string;
  info: string;
  comment: string;
};

type PrescriptionSection = {
  id: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
  groupTitle: string;
  items: PrescriptionItem[];
};

type RecommendationCardStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  ageCategory: "Взрослые" | "Дети";
  prescriptions: PrescriptionSection[];
};

const visitTypes = ["primary", "repeat", "inpatient"] as const;

const emptyAvailability = (): FilterAvailability => ({
  adult: { primary: false, repeat: false, inpatient: false },
  child: { primary: false, repeat: false, inpatient: false },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const appointmentMatchesVisit = (appointment: EasyMedAppointment, visit: VisitType) => {
  const isStationary = toNumber(appointment.is_stationary) === 1;

  if (visit === "inpatient") return isStationary;
  if (isStationary) return false;

  return toNumber(appointment.stage) === (visit === "primary" ? 1 : 2);
};

const standardMatchesVisit = (standard: EasyMedStandard, visit: VisitType) =>
  [...(standard.examinations ?? []), ...(standard.treatments ?? [])].some((appointment) =>
    appointmentMatchesVisit(appointment, visit),
  );

const getStandards = (branch: unknown): EasyMedStandard[] => {
  if (!isRecord(branch) || !Array.isArray((branch as EasyMedBranch).standards)) return [];

  return (branch as { standards: EasyMedStandard[] }).standards;
};

const getString = (value: unknown, fallback = "—") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;


const getStringOrEmpty = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const slugify = (value: string, fallback: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
};

const getBoolean = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";

const getPersCode = (pers: EasyMedPers | null | undefined) => {
  const recommendationLevel = getStringOrEmpty(pers?.уур);
  const evidenceLevel = getStringOrEmpty(pers?.удд);

  return recommendationLevel || evidenceLevel ? `${recommendationLevel}${evidenceLevel}` : "";
};

const getAppointmentInfo = (appointment: EasyMedAppointment, crTextById: CrTextById) => {
  const crDbId = getStringOrEmpty(appointment.cr_db_id);
  const recommendationText = crDbId ? crTextById[crDbId] : undefined;
  const parts = [
    recommendationText?.text,
    recommendationText?.comment,
    getStringOrEmpty(appointment.comment),
    getStringOrEmpty(appointment.plan),
    getStringOrEmpty(appointment.duration),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("\n\n") : "Описание рекомендации не найдено";
};

const getSectionMeta = (appointment: EasyMedAppointment, source: "examination" | "treatment") => {
  if (source === "examination") {
    const isRequired = toNumber(appointment.is_required) === 1;
    const categoryTitle = isRequired ? "Диагностика обязательная" : "Диагностика по показаниям";

    return {
      categoryId: isRequired ? "required-diagnostics" : "indicated-diagnostics",
      categoryTitle,
      sectionTitle: getString(appointment.category_name, categoryTitle),
      groupTitle: categoryTitle,
    };
  }

  if (getStringOrEmpty(appointment.type) === "drug") {
    return {
      categoryId: "medications",
      categoryTitle: "Препараты",
      sectionTitle: "Лекарственные назначения",
      groupTitle: "Препараты",
    };
  }

  return {
    categoryId: "treatment",
    categoryTitle: "Лечение",
    sectionTitle: "Лечебные назначения",
    groupTitle: "Лечение",
  };
};

const normalizeAppointment = (
  appointment: EasyMedAppointment,
  index: number,
  source: "examination" | "treatment",
  crTextById: CrTextById,
): PrescriptionItem => {
  const title = getString(appointment.name, "Назначение");
  const crDbId = getStringOrEmpty(appointment.cr_db_id);

  return {
    id: `${source}-${index}-${slugify(crDbId, "cr")}-${slugify(title, "item")}`,
    checked: false,
    qualityControl: getBoolean(appointment.is_qualitative),
    code: getPersCode(appointment.pers),
    title,
    info: getAppointmentInfo(appointment, crTextById),
    comment: "",
  };
};

const normalizePrescriptionSections = (
  standard: EasyMedStandard,
  visit: VisitType,
  crTextById: CrTextById,
): PrescriptionSection[] => {
  const sourceItems = [
    ...(standard.examinations ?? []).map((item) => ({ item, source: "examination" as const })),
    ...(standard.treatments ?? []).map((item) => ({ item, source: "treatment" as const })),
  ].filter(({ item }) => appointmentMatchesVisit(item, visit));

  const sections = new Map<string, PrescriptionSection>();

  sourceItems.forEach(({ item, source }, index) => {
    const { categoryId, categoryTitle, sectionTitle, groupTitle } = getSectionMeta(item, source);
    const sectionId = `${categoryId}-${slugify(sectionTitle, source)}`;
    const section = sections.get(sectionId) ?? {
      id: sectionId,
      title: sectionTitle,
      categoryId,
      categoryTitle,
      groupTitle,
      items: [],
    };

    section.items.push(normalizeAppointment(item, index, source, crTextById));
    sections.set(sectionId, section);
  });

  return Array.from(sections.values());
};

const normalizeCrTexts = (items: unknown): CrTextById => {
  if (!Array.isArray(items)) return {};

  return items.reduce<CrTextById>((acc, item) => {
    if (!isRecord(item)) return acc;

    const crDbId = getStringOrEmpty(item.cr_db_id);
    const value = isRecord(item.value) ? item.value : null;
    if (!crDbId || !value) return acc;

    acc[crDbId] = {
      text: getStringOrEmpty(value.text),
      comment: getStringOrEmpty(value.comment),
    };

    return acc;
  }, {});
};

const getMkbCodes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeStandards = (
  standards: EasyMedStandard[],
  ageCategory: RecommendationCardStandard["ageCategory"],
  visit: VisitType,
  crTextById: CrTextById,
) => {
  const seen = new Set<string>();

  return standards
    .filter((standard) => standardMatchesVisit(standard, visit))
    .map<RecommendationCardStandard>((standard) => ({
      id: getString(standard.cr_m_id),
      title: getString(standard.name, "Клиническая рекомендация"),
      status: getString(standard.status),
      source: getString(standard.cr_source),
      mkbCodes: getMkbCodes(standard.mkb_codes),
      ageCategory,
      prescriptions: normalizePrescriptionSections(standard, visit, crTextById),
    }))
    .filter((standard) => {
      const key = `${standard.id}:${standard.title}`.toLowerCase();
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
};

const buildAvailability = (branches: Record<AgeGroup, EasyMedStandard[]>): FilterAvailability => {
  const availability = emptyAvailability();

  (Object.keys(branches) as AgeGroup[]).forEach((age) => {
    visitTypes.forEach((visit) => {
      availability[age][visit] = branches[age].some((standard) =>
        standardMatchesVisit(standard, visit),
      );
    });
  });

  return availability;
};

const normalizeRecommendations = (items: unknown) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();

  return items.filter((item): item is { code: string; name: string } => {
    if (!isRecord(item) || typeof item.code !== "string" || typeof item.name !== "string") return false;

    const key = item.code.trim().toLowerCase();
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const buildUpstreamUrl = (baseUrl: string, code: string) => {
  const upstreamUrl = new URL(baseUrl);
  upstreamUrl.searchParams.set("code", code);
  upstreamUrl.searchParams.set("username", EASYMED_USERNAME);
  upstreamUrl.searchParams.set("password", EASYMED_PASSWORD);

  return upstreamUrl;
};

const fetchJson = async <T>(url: URL, errorMessage: string): Promise<T> => {
  const upstreamResponse = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!upstreamResponse.ok) {
    throw new Error(errorMessage);
  }

  return upstreamResponse.json() as Promise<T>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json(
      { error: "Missing required parameter: code" },
      { status: 400 },
    );
  }

  try {
    const [mkbData, recommendationsData, crTextData] = await Promise.all([
      fetchJson<EasyMedMkbResponse>(
        buildUpstreamUrl(EASYMED_MKB_URL, code),
        "EasyMed standards request failed",
      ),
      fetchJson<RecommendationsResponse>(
        buildUpstreamUrl(EASYMED_MKB_CR_URL, code),
        "EasyMed recommendations request failed",
      ),
      fetchJson<EasyMedCrTextItem[]>(
        buildUpstreamUrl(EASYMED_CR_TEXT_URL, code),
        "EasyMed recommendation texts request failed",
      ),
    ]);

    const branches = {
      adult: getStandards(mkbData.grownup),
      child: getStandards(mkbData.child),
    } satisfies Record<AgeGroup, EasyMedStandard[]>;
    const crTextById = normalizeCrTexts(crTextData);

    return NextResponse.json({
      availability: buildAvailability(branches),
      recommendations: {
        child: normalizeRecommendations(recommendationsData.child),
        grownup: normalizeRecommendations(recommendationsData.grownup),
      },
      standards: {
        adult: {
          primary: normalizeStandards(branches.adult, "Взрослые", "primary", crTextById),
          repeat: normalizeStandards(branches.adult, "Взрослые", "repeat", crTextById),
          inpatient: normalizeStandards(branches.adult, "Взрослые", "inpatient", crTextById),
        },
        child: {
          primary: normalizeStandards(branches.child, "Дети", "primary", crTextById),
          repeat: normalizeStandards(branches.child, "Дети", "repeat", crTextById),
          inpatient: normalizeStandards(branches.child, "Дети", "inpatient", crTextById),
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "EasyMed MKB data service is unavailable" },
      { status: 503 },
    );
  }
}
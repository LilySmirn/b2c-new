import { NextResponse } from "next/server";

const EASYMED_MKB_URL = "https://easymed.pro/php/API/get-mkb.php";
const EASYMED_MKB_CR_URL = "https://easymed.pro/php/API/get-mkb-cr.php";
const EASYMED_USERNAME = process.env.EASYMED_API_USERNAME ?? "testAPI";
const EASYMED_PASSWORD = process.env.EASYMED_API_PASSWORD ?? "w_SfRR!2kd";

type AgeGroup = "adult" | "child";
type VisitType = "primary" | "repeat" | "inpatient";
type FilterAvailability = Record<AgeGroup, Record<VisitType, boolean>>;

type EasyMedAppointment = {
  stage?: number | string | null;
  is_stationary?: number | string | null;
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

type RecommendationCardStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  ageCategory: "Взрослые" | "Дети";
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

const getMkbCodes = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const normalizeStandards = (
  standards: EasyMedStandard[],
  ageCategory: RecommendationCardStandard["ageCategory"],
  visit: VisitType,
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
    const [mkbData, recommendationsData] = await Promise.all([
      fetchJson<EasyMedMkbResponse>(
        buildUpstreamUrl(EASYMED_MKB_URL, code),
        "EasyMed standards request failed",
      ),
      fetchJson<RecommendationsResponse>(
        buildUpstreamUrl(EASYMED_MKB_CR_URL, code),
        "EasyMed recommendations request failed",
      ),
    ]);

    const branches = {
      adult: getStandards(mkbData.grownup),
      child: getStandards(mkbData.child),
    } satisfies Record<AgeGroup, EasyMedStandard[]>;

    return NextResponse.json({
      availability: buildAvailability(branches),
      recommendations: {
        child: normalizeRecommendations(recommendationsData.child),
        grownup: normalizeRecommendations(recommendationsData.grownup),
      },
      standards: {
        adult: {
          primary: normalizeStandards(branches.adult, "Взрослые", "primary"),
          repeat: normalizeStandards(branches.adult, "Взрослые", "repeat"),
          inpatient: normalizeStandards(branches.adult, "Взрослые", "inpatient"),
        },
        child: {
          primary: normalizeStandards(branches.child, "Дети", "primary"),
          repeat: normalizeStandards(branches.child, "Дети", "repeat"),
          inpatient: normalizeStandards(branches.child, "Дети", "inpatient"),
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
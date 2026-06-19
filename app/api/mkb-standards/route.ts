import { NextResponse } from "next/server";

const EASYMED_MKB_URL = "https://easymed.pro/php/API/get-mkb.php";
const EASYMED_USERNAME = process.env.EASYMED_API_USERNAME ?? "testAPI";
const EASYMED_PASSWORD = process.env.EASYMED_API_PASSWORD ?? "w_SfRR!2kd";

type AgeGroup = "adult" | "child";
type VisitType = "primary" | "repeat" | "inpatient";

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

type RecommendationCardStandard = {
  id: string;
  title: string;
  status: string;
  source: string;
  mkbCodes: string[];
  ageCategory: "Взрослые" | "Дети";
};

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

const getAgeBranch = (data: EasyMedMkbResponse, age: AgeGroup) =>
  age === "child"
    ? { standards: getStandards(data.child), label: "Дети" as const }
    : { standards: getStandards(data.grownup), label: "Взрослые" as const };

const isAgeGroup = (value: string | null): value is AgeGroup => value === "adult" || value === "child";
const isVisitType = (value: string | null): value is VisitType =>
  value === "primary" || value === "repeat" || value === "inpatient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  const age = searchParams.get("age");
  const visit = searchParams.get("visit");

  if (!code) {
    return NextResponse.json({ error: "Missing required parameter: code" }, { status: 400 });
  }

  if (!isAgeGroup(age) || !isVisitType(visit)) {
    return NextResponse.json({ error: "Invalid age or visit parameter" }, { status: 400 });
  }

  const upstreamUrl = new URL(EASYMED_MKB_URL);
  upstreamUrl.searchParams.set("code", code);
  upstreamUrl.searchParams.set("username", EASYMED_USERNAME);
  upstreamUrl.searchParams.set("password", EASYMED_PASSWORD);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "EasyMed standards request failed" },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as EasyMedMkbResponse;
    const branch = getAgeBranch(data, age);

    return NextResponse.json({
      standards: normalizeStandards(branch.standards, branch.label, visit),
    });
  } catch {
    return NextResponse.json(
      { error: "EasyMed standards service is unavailable" },
      { status: 503 },
    );
  }
}
import { NextResponse } from "next/server";

const EASYMED_MKB_URL = "https://easymed.pro/php/API/get-mkb.php";
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

const buildAvailability = (data: EasyMedMkbResponse): FilterAvailability => {
  const availability = emptyAvailability();
  const branches = {
    adult: getStandards(data.grownup),
    child: getStandards(data.child),
  } satisfies Record<AgeGroup, EasyMedStandard[]>;

  (Object.keys(branches) as AgeGroup[]).forEach((age) => {
    (Object.keys(availability[age]) as VisitType[]).forEach((visit) => {
      availability[age][visit] = branches[age].some((standard) =>
        standardMatchesVisit(standard, visit),
      );
    });
  });

  return availability;
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
        { error: "EasyMed filters request failed" },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as EasyMedMkbResponse;

    return NextResponse.json({ availability: buildAvailability(data) });
  } catch {
    return NextResponse.json(
      { error: "EasyMed filters service is unavailable" },
      { status: 503 },
    );
  }
}
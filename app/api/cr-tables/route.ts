import { NextResponse } from "next/server";
import { encryptPayload } from "@/app/lib/encryptedPayload/server";

const EASYMED_CR_TABLES_URL = "https://easymed.pro/php/API/get-cr-tables.php";
const EASYMED_USERNAME = process.env.EASYMED_API_USERNAME ?? "testAPI";
const EASYMED_PASSWORD = process.env.EASYMED_API_PASSWORD ?? "w_SfRR!2kd";

type NormalizedCrTable = {
  name: string | null;
  html: string;
  comment: string | null;
};

type EasyMedCrTable = {
  name?: unknown;
  html?: unknown;
  comment?: unknown;
};

const normalizeCrTables = (items: unknown): NormalizedCrTable[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): NormalizedCrTable | null => {
      if (!item || typeof item !== "object") return null;

      const table = item as EasyMedCrTable;
      if (typeof table.html !== "string" || !table.html.trim()) return null;

      return {
        name: typeof table.name === "string" && table.name.trim() ? table.name : null,
        html: table.html,
        comment:
          typeof table.comment === "string" && table.comment.trim()
            ? table.comment
            : null,
      };
    })
    .filter((item): item is NormalizedCrTable => Boolean(item));
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crMId = searchParams.get("cr_m_id")?.trim();

  if (!crMId) {
    return NextResponse.json(
      { error: "Missing required parameter: cr_m_id" },
      { status: 400 },
    );
  }

  const upstreamUrl = new URL(EASYMED_CR_TABLES_URL);
  upstreamUrl.searchParams.set("cr_m_id", crMId);
  upstreamUrl.searchParams.set("username", EASYMED_USERNAME);
  upstreamUrl.searchParams.set("password", EASYMED_PASSWORD);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "EasyMed CR tables request failed" },
        { status: upstreamResponse.status },
      );
    }

    const data = await upstreamResponse.json();

    return NextResponse.json(encryptPayload({ tables: normalizeCrTables(data) }));
  } catch {
    return NextResponse.json(
      { error: "EasyMed CR tables service is unavailable" },
      { status: 503 },
    );
  }
}
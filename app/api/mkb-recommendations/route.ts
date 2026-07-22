import { NextResponse } from "next/server";
import { encryptPayload } from "@/app/lib/encryptedPayload/server";

const EASYMED_MKB_CR_URL = "https://easymed.pro/php/API/get-mkb-cr.php";
const EASYMED_USERNAME = process.env.EASYMED_API_USERNAME ?? "testAPI";
const EASYMED_PASSWORD = process.env.EASYMED_API_PASSWORD ?? "w_SfRR!2kd";

type EasyMedMkbRecommendation = {
  code?: unknown;
  name?: unknown;
};

type RecommendationsResponse = {
  child?: unknown;
  grownup?: unknown;
};

const isRecommendation = (
  item: EasyMedMkbRecommendation,
): item is { code: string; name: string } =>
  typeof item.code === "string" && typeof item.name === "string";

const normalizeRecommendations = (items: unknown) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();

  return items.filter((item): item is { code: string; name: string } => {
    if (!isRecommendation(item)) return false;

    const key = item.code.trim().toLowerCase();
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
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

  const upstreamUrl = new URL(EASYMED_MKB_CR_URL);
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
        { error: "EasyMed recommendations request failed" },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as RecommendationsResponse;

    return NextResponse.json(
      encryptPayload({
        child: normalizeRecommendations(data.child),
        grownup: normalizeRecommendations(data.grownup),
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "EasyMed recommendations service is unavailable" },
      { status: 503 },
    );
  }
}
import { NextResponse } from "next/server";
import { getCurrentUserAllowedMkbCodes } from "@/app/lib/mkbAccess";
import { isMkbCodeAllowed } from "@/app/lib/mkbCodeAccess";

const EASYMED_SEARCH_URL = "https://easymed.pro/php/API/search.php";

type EasyMedSearchItem = {
  code?: unknown;
  name?: unknown;
};

type ValidSearchItem = {
  code: string;
  name: string;
};

const isValidSearchItem = (item: EasyMedSearchItem): item is ValidSearchItem =>
  typeof item.code === "string" && typeof item.name === "string";

const getSearchItemKey = ({ code, name }: ValidSearchItem) =>
  `${code.trim().toLowerCase()}::${name.trim().toLowerCase()}`;

const getUniqueSearchItems = (items: EasyMedSearchItem[]): ValidSearchItem[] => {
  const seen = new Set<string>();

  return items.filter((item): item is ValidSearchItem => {
    if (!isValidSearchItem(item)) return false;

    const key = getSearchItemKey(item);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  if (!search) {
    return NextResponse.json(
      { error: "Missing required parameter: search" },
      { status: 400 },
    );
  }

  const allowedCodes = await getCurrentUserAllowedMkbCodes();
  if (allowedCodes === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstreamUrl = new URL(EASYMED_SEARCH_URL);
  upstreamUrl.searchParams.set("search", search);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "EasyMed search request failed" },
        { status: upstreamResponse.status },
      );
    }

    const data = (await upstreamResponse.json()) as unknown;

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Unexpected EasyMed search response" },
        { status: 502 },
      );
    }

    const items = getUniqueSearchItems(data);
    const visibleItems = allowedCodes === null
      ? items
      : items.filter((item) => isMkbCodeAllowed(item.code, allowedCodes));

    return NextResponse.json(visibleItems);
  } catch {
    return NextResponse.json(
      { error: "EasyMed search service is unavailable" },
      { status: 503 },
    );
  }
}
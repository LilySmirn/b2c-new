import { NextResponse } from "next/server";

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

const getUniqueSearchItems = (items: EasyMedSearchItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
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

    return NextResponse.json(getUniqueSearchItems(data));
  } catch {
    return NextResponse.json(
      { error: "EasyMed search service is unavailable" },
      { status: 503 },
    );
  }
}
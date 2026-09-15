import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { getCurrentUserAllowedMkbCodes } from "@/app/lib/mkbAccess";
import { getB2cSessionStatus } from "@/app/lib/requireActiveB2cSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

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

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  if (session.user.accountType === "b2c") {
    const { isActive, wasReplaced } = await getB2cSessionStatus(session);
    if (!isActive) {
      return NextResponse.json(
        {
          error: "session_invalid",
          reason: wasReplaced ? "newer_login" : "invalid_session",
        },
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }
  }

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

    return NextResponse.json(getUniqueSearchItems(data), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "EasyMed search service is unavailable" },
      { status: 503 },
    );
  }
}
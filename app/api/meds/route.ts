import { NextResponse } from "next/server";
import { proxyMedsRequest } from "@/app/lib/medsUpstream";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be a JSON array of strings" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const result = await proxyMedsRequest(payload);

  return NextResponse.json(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

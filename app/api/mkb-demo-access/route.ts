import { NextResponse } from "next/server";

import { getB2cMkbDemoStatus } from "@/app/lib/db";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";

export async function GET() {
  const session = await requireActiveB2cSession("api");
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getB2cMkbDemoStatus(session.user.id), {
    headers: { "Cache-Control": "no-store" },
  });
}
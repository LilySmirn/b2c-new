import { NextResponse } from "next/server";

import { getCurrentUserAllowedMkbCodes } from "@/app/lib/mkbAccess";

export async function GET() {
  const allowedCodes = await getCurrentUserAllowedMkbCodes();

  if (allowedCodes === undefined) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ allowedCodes });
}
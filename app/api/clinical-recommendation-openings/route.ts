import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/lib/auth";
import { registerClinicalRecommendationOpening } from "@/app/modules/clinicalRecommendationOpening/server/service";

const MAX_RECOMMENDATION_KEY_LENGTH = 255;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recommendationKey: unknown;
  try {
    ({ recommendationKey } = (await request.json()) as { recommendationKey?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof recommendationKey !== "string" ||
    recommendationKey.trim() === "" ||
    recommendationKey.length > MAX_RECOMMENDATION_KEY_LENGTH
  ) {
    return NextResponse.json({ error: "Invalid recommendation key" }, { status: 400 });
  }

  const result = await registerClinicalRecommendationOpening(userId, recommendationKey.trim());
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
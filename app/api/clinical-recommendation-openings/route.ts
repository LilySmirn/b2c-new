import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/lib/auth";
import { registerClinicalRecommendationOpeningEvent } from "@/app/modules/clinicalRecommendationOpening/server/service";

const MAX_RECOMMENDATION_KEY_LENGTH = 255;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId, type, visitId, recommendationKey } = body;
  const validType = type === "selected" || type === "cart_opened" || type === "cart_left";
  const validKey = type !== "selected" || (
    typeof recommendationKey === "string" &&
    recommendationKey.trim() !== "" &&
    recommendationKey.length <= MAX_RECOMMENDATION_KEY_LENGTH
  );
  if (typeof eventId !== "string" || eventId.length < 1 || eventId.length > 100 ||
      typeof visitId !== "string" || visitId.length < 1 || visitId.length > 100 ||
      !validType || !validKey) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const result = await registerClinicalRecommendationOpeningEvent(userId, {
    eventId,
    type,
    visitId,
    recommendationKey: typeof recommendationKey === "string" ? recommendationKey.trim() : undefined,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
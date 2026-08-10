import { USER_BLOCK_REASON_CODES } from "@/app/modules/userBlocking";
import { blockUser } from "@/app/modules/userBlocking/server";

import { recordUniqueOpening, releaseFailedBlock } from "./openingTracker";

export const UNIQUE_OPENING_LIMIT = 20;

export async function registerClinicalRecommendationOpening(
  userId: string,
  recommendationKey: string,
): Promise<{ blocked: boolean }> {
  const result = recordUniqueOpening(userId, recommendationKey, UNIQUE_OPENING_LIMIT);

  if (!result.shouldBlock) return { blocked: result.thresholdReached };

  try {
    await blockUser({
      userId,
      reason:
        USER_BLOCK_REASON_CODES.FREQUENT_UNIQUE_CLINICAL_RECOMMENDATION_REQUESTS,
    });
    return { blocked: true };
  } catch (error) {
    releaseFailedBlock(userId);
    throw error;
  }
}
import { USER_BLOCK_REASON_CODES } from "@/app/modules/userBlocking";
import { blockUser } from "@/app/modules/userBlocking/server";

import {
  recordOpeningEvent,
  recordUniqueOpening,
  releaseFailedAutomatedBrowsingBlock,
  releaseFailedUniqueOpeningBlock,
} from "./openingTracker";

export const SUSPICIOUS_OPENING_LIMIT = 10;
export const UNIQUE_OPENING_LIMIT = 20;

/** Preserve the pre-existing frequent unique recommendation detector. */
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
    releaseFailedUniqueOpeningBlock(userId);
    throw error;
  }
}

export type ClinicalRecommendationOpeningEvent = {
  eventId: string;
  type: "selected" | "cart_opened" | "cart_left";
  visitId: string;
  recommendationKey?: string;
};

export async function registerClinicalRecommendationOpeningEvent(
  userId: string,
  event: ClinicalRecommendationOpeningEvent,
): Promise<{ blocked: boolean }> {
  const result = recordOpeningEvent(userId, event, SUSPICIOUS_OPENING_LIMIT);
  if (!result.shouldBlock) return { blocked: result.thresholdReached };

  try {
    await blockUser({
      userId,
      reason:
        USER_BLOCK_REASON_CODES.AUTOMATED_CLINICAL_RECOMMENDATION_BROWSING,
    });
    return { blocked: true };
  } catch (error) {
    releaseFailedAutomatedBrowsingBlock(userId);
    throw error;
  }
}
const WINDOW_MS = 2 * 60 * 1_000;

type UserOpeningState = {
  openings: Map<string, number>;
  blocking: boolean;
};

type TrackerStore = Map<string, UserOpeningState>;

declare global {
  // Keep the counter across Next.js development reloads. Production processes
  // retain the same module-global instance for their lifetime.
  var clinicalRecommendationOpeningStore: TrackerStore | undefined;
}

const store = globalThis.clinicalRecommendationOpeningStore ?? new Map();
globalThis.clinicalRecommendationOpeningStore = store;

export const UNIQUE_OPENING_WINDOW_MS = WINDOW_MS;

/**
 * Process-local sliding-window counter. No browsing history is persisted in
 * the database; only blockUser writes the resulting block to users.
 */
export function recordUniqueOpening(
  userId: string,
  recommendationKey: string,
  limit: number,
  now = Date.now(),
): { shouldBlock: boolean; thresholdReached: boolean } {
  const state = store.get(userId) ?? { openings: new Map(), blocking: false };
  const cutoff = now - WINDOW_MS;

  for (const [key, openedAt] of state.openings) {
    if (openedAt < cutoff) state.openings.delete(key);
  }

  // Updating an existing key keeps it in the sliding window but cannot add to
  // the number of unique recommendations.
  state.openings.set(recommendationKey, now);
  store.set(userId, state);

  if (state.blocking) {
    return { shouldBlock: false, thresholdReached: true };
  }

  if (state.openings.size < limit) {
    return { shouldBlock: false, thresholdReached: false };
  }

  state.blocking = true;
  return { shouldBlock: true, thresholdReached: true };
}

export function releaseFailedBlock(userId: string): void {
  const state = store.get(userId);
  if (state) state.blocking = false;
}
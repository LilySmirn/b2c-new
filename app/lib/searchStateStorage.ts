export const SEARCH_STATE_STORAGE_KEY = "directorySearchState";

// This limit applies only to the optional copy used to restore the search after
// navigation. The live React state is never changed, so every card returned by
// the API remains available for rendering on the current /mkb page.
export const MAX_CACHED_SEARCH_STATE_LENGTH = 1_000_000;

type SearchStateWithResponse = {
  mkbData?: unknown;
  [key: string]: unknown;
};

const withoutCachedResponse = <T extends SearchStateWithResponse>(state: T): T => ({
  ...state,
  mkbData: null,
});

export const readSearchState = <T>(storage: Storage): T | null => {
  try {
    const storedValue = storage.getItem(SEARCH_STATE_STORAGE_KEY);
    if (!storedValue) return null;

    const parsed = JSON.parse(storedValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
};

export const writeSearchState = <T extends SearchStateWithResponse>(
  storage: Storage,
  state: T,
) => {
  const serializedState = JSON.stringify(state);
  const value = serializedState.length <= MAX_CACHED_SEARCH_STATE_LENGTH
    ? serializedState
    : JSON.stringify(withoutCachedResponse(state));

  try {
    storage.setItem(SEARCH_STATE_STORAGE_KEY, value);
  } catch {
    // The browser can have a smaller quota or storage can already be full.
    // Replace a previous large entry with the lightweight state instead of
    // allowing QuotaExceededError to crash the page.
    try {
      storage.removeItem(SEARCH_STATE_STORAGE_KEY);
      storage.setItem(SEARCH_STATE_STORAGE_KEY, JSON.stringify(withoutCachedResponse(state)));
    } catch {
      // Search remains fully usable when persistence is unavailable.
    }
  }
};
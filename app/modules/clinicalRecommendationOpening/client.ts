export const CART_VISIT_STORAGE_KEY = "clinicalRecommendationCartVisit";
const MAX_RECOMMENDATION_KEY_LENGTH = 255;

export type CartVisit = { visitId: string; recommendationKey: string };

export const createEventId = () => crypto.randomUUID();

export async function normalizeOpeningRecommendationKey(recommendationKey: string) {
  const normalizedKey = recommendationKey.trim();
  if (normalizedKey.length <= MAX_RECOMMENDATION_KEY_LENGTH) return normalizedKey;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedKey),
  );
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `sha256:${hash}`;
}

export async function sendOpeningEvent(
  event: { eventId: string; type: "selected" | "cart_opened" | "cart_left"; visitId: string; recommendationKey?: string },
  useBeacon = false,
) {
  const body = JSON.stringify(event);
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/clinical-recommendation-openings",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }

  const response = await fetch("/api/clinical-recommendation-openings", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
  if (!response.ok) throw new Error("Failed to register recommendation event");
}

export async function beginCartVisit(recommendationKey: string): Promise<CartVisit> {
  const openingRecommendationKey = await normalizeOpeningRecommendationKey(recommendationKey);
  const visit = { visitId: crypto.randomUUID(), recommendationKey: openingRecommendationKey };
  await sendOpeningEvent({
    eventId: createEventId(),
    type: "selected",
    ...visit,
  });
  window.sessionStorage.setItem(CART_VISIT_STORAGE_KEY, JSON.stringify(visit));
  return visit;
}
export const CART_VISIT_STORAGE_KEY = "clinicalRecommendationCartVisit";

export type CartVisit = { visitId: string; recommendationKey: string };

export const createEventId = () => crypto.randomUUID();

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
  const visit = { visitId: crypto.randomUUID(), recommendationKey };
  await sendOpeningEvent({
    eventId: createEventId(),
    type: "selected",
    ...visit,
  });
  window.sessionStorage.setItem(CART_VISIT_STORAGE_KEY, JSON.stringify(visit));
  return visit;
}
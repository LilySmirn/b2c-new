import { beginCartVisit } from "@/app/modules/clinicalRecommendationOpening/client";
import { cartStorage } from "@/app/(directory)/shared/cart";
import { collectMedicationQuery } from "@/app/(directory)/components/medications/medicationQuery";
import { medsCatalogSession } from "@/app/(directory)/components/medications/medsCatalogSession";
import type { RecommendationStandard } from "./types";

export const MEDS_LOAD_ERROR =
  "Не удалось загрузить справочник препаратов. Попробуйте ещё раз.";

export const OPEN_RECOMMENDATION_ERROR =
  "Не удалось открыть рекомендацию. Попробуйте позже.";

export const getCartRecommendationKey = (
  diagnosisTitle: string | null | undefined,
  card: Pick<RecommendationStandard, "id" | "title" | "mkbCodes">,
) =>
  [diagnosisTitle, card.id, card.title, card.mkbCodes.join(",")]
    .filter(Boolean)
    .join("|");

export const getRecommendationExternalUrl = (source: string, id: string) => {
  if (source.toLowerCase() === "minzdrav" && id !== "—") {
    return `https://cr.minzdrav.gov.ru/view-cr/${encodeURIComponent(id)}`;
  }

  return "https://cr.minzdrav.gov.ru/";
};

export const persistSelectedRecommendation = (
  diagnosisTitle: string,
  card: RecommendationStandard,
) => {
  const recommendationKey = getCartRecommendationKey(diagnosisTitle, card);
  cartStorage.writeRecommendation(diagnosisTitle, card, recommendationKey);
  return recommendationKey;
};

export type PrepareSelectedRecommendationResult =
  | { ok: true; recommendationKey: string }
  | { ok: false; error: string; stale?: boolean };

export type PrepareSelectedRecommendationOptions = {
  /** Отклонить результат, если запрос устарел. */
  isCurrent?: () => boolean;
  /** Регистрировать visit / selected (как при переходе с `/mkb`). */
  beginVisit?: boolean;
};

/**
 * Загрузка meds → persist КР → опционально beginCartVisit.
 * Persist только после успешной загрузки meds, чтобы не оставлять
 * storage в частично переключённом состоянии при ошибке.
 * Без навигации — вызывающая сторона гидратирует `/cart` или делает push.
 */
export async function prepareSelectedRecommendation(
  diagnosisTitle: string,
  card: RecommendationStandard,
  options: PrepareSelectedRecommendationOptions = {},
): Promise<PrepareSelectedRecommendationResult> {
  const isCurrent = options.isCurrent ?? (() => true);
  const beginVisit = options.beginVisit ?? true;

  const recommendationKey = getCartRecommendationKey(diagnosisTitle, card);
  const query = collectMedicationQuery(card.prescriptions);

  let loadResult: Awaited<ReturnType<typeof medsCatalogSession.load>>;
  try {
    loadResult = await medsCatalogSession.load(
      recommendationKey,
      query.names,
      query.ids,
    );
  } catch {
    if (!isCurrent()) return { ok: false, error: MEDS_LOAD_ERROR, stale: true };
    return { ok: false, error: MEDS_LOAD_ERROR };
  }

  if (!isCurrent()) {
    return { ok: false, error: MEDS_LOAD_ERROR, stale: true };
  }
  if (loadResult.status === "stale") {
    return { ok: false, error: MEDS_LOAD_ERROR, stale: true };
  }
  if (loadResult.status !== "ready") {
    return { ok: false, error: MEDS_LOAD_ERROR };
  }

  if (beginVisit) {
    try {
      const visit = await beginCartVisit(recommendationKey, isCurrent);
      if (!isCurrent()) {
        return { ok: false, error: OPEN_RECOMMENDATION_ERROR, stale: true };
      }
      if (!visit) {
        return { ok: false, error: OPEN_RECOMMENDATION_ERROR };
      }
    } catch {
      if (!isCurrent()) {
        return { ok: false, error: OPEN_RECOMMENDATION_ERROR, stale: true };
      }
      return { ok: false, error: OPEN_RECOMMENDATION_ERROR };
    }
  }

  if (!isCurrent()) {
    return { ok: false, error: OPEN_RECOMMENDATION_ERROR, stale: true };
  }

  persistSelectedRecommendation(diagnosisTitle, card);
  return { ok: true, recommendationKey };
}

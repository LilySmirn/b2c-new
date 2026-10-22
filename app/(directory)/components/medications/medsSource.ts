/**
 * Источник справочника препаратов.
 *
 * `NEXT_PUBLIC_MEDS_SOURCE=real` — запрос в реальный API. Это режим по умолчанию.
 * `NEXT_PUBLIC_MEDS_SOURCE=mock` — локальный `design/cart/meds-mock-cart-v5.json`.
 *
 * Любое другое значение считается `real`: рабочий режим не подменяется моком.
 * Результаты режимов лежат в разных ключах хранилища и не смешиваются.
 * Флаг прежней гибридной подстановки комбинаций не читается и на ответ не влияет.
 */
export type MedsSource = "real" | "mock";

export const readMedsSource = (
  value: string | undefined = process.env.NEXT_PUBLIC_MEDS_SOURCE,
): MedsSource => (value?.trim().toLowerCase() === "mock" ? "mock" : "real");

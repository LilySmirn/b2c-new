/**
 * Источник справочника препаратов.
 *
 * `NEXT_PUBLIC_MEDS_SOURCE=real` — запрос в реальный API. Это режим по умолчанию.
 * `NEXT_PUBLIC_MEDS_SOURCE=mock` — локальный `design/cart/meds-mock-cart-v5.json`.
 *
 * Любое другое значение считается `real`: рабочий режим не подменяется моком.
 * Результаты режимов лежат в разных ключах хранилища и не смешиваются.
 *
 * `NEXT_PUBLIC_MEDS_COMBINATION_MOCK=true` — временная подстановка заранее
 * известных тестовых комбинаций, если реальный API вернул для них `other`.
 * В production по умолчанию выключено. Настоящий `combination` сервера важнее мока.
 */
export type MedsSource = "real" | "mock";

export const readMedsSource = (
  value: string | undefined = process.env.NEXT_PUBLIC_MEDS_SOURCE,
): MedsSource => (value?.trim().toLowerCase() === "mock" ? "mock" : "real");

export const readMedsCombinationMock = (
  value: string | undefined = process.env.NEXT_PUBLIC_MEDS_COMBINATION_MOCK,
): boolean => value?.trim().toLowerCase() === "true";

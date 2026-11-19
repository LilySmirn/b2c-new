export const DEMO_LIMIT_MESSAGE =
  "Бесплатные 5 запросов на сегодня закончились. Для снятия ограничения приобретите подписку.";

export const isDemoLimitResponse = async (response: Response) => {
  if (response.status !== 429) return false;

  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return body?.error === "demo_limit_reached";
};

export const formatDemoRemaining = (remaining: number) => {
  if (remaining === 1) return "Вам остался 1 запрос";
  if (remaining >= 2 && remaining <= 4) {
    return `Вам осталось ${remaining} запроса`;
  }
  return `Вам осталось ${remaining} запросов`;
};

/**
 * Серверный прокси `POST https://easymed.pro/php/API/get-meds.php`.
 * Браузер ходит только на `/api/meds`: у апстрима нет CORS.
 * Названия передаются как есть, в том числе строки с `++`.
 */

export const MEDS_UPSTREAM_URL = "https://easymed.pro/php/API/get-meds.php";
export const MEDS_UPSTREAM_TIMEOUT_MS = 30_000;

export type MedsProxyResult = {
  status: number;
  body: unknown;
};

const isNameList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isTimeout = (error: unknown) =>
  error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");

export const proxyMedsRequest = async (
  payload: unknown,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = MEDS_UPSTREAM_TIMEOUT_MS,
): Promise<MedsProxyResult> => {
  if (!isNameList(payload)) {
    return {
      status: 400,
      body: { error: "Request body must be a JSON array of strings" },
    };
  }

  try {
    const upstream = await fetchImpl(MEDS_UPSTREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const text = await upstream.text();

    if (!upstream.ok) {
      console.error("[meds] upstream HTTP", upstream.status);
      return {
        status: upstream.status,
        body: { error: "Meds catalog request failed" },
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("[meds] upstream response is not JSON");
      return { status: 502, body: { error: "Meds catalog response is not JSON" } };
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Array.isArray((parsed as { drugs?: unknown }).drugs)
    ) {
      console.error("[meds] upstream response has an unexpected shape");
      return {
        status: 502,
        body: { error: "Meds catalog response has an unexpected shape" },
      };
    }

    return { status: 200, body: parsed };
  } catch (error) {
    const timedOut = isTimeout(error);
    console.error("[meds] upstream request failed:", timedOut ? "timeout" : "network");
    return {
      status: timedOut ? 504 : 503,
      body: {
        error: timedOut
          ? "Meds catalog request timed out"
          : "Meds catalog service is unavailable",
      },
    };
  }
};

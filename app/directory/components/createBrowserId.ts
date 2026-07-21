const UUID_PATTERN = "10000000-1000-4000-8000-100000000000";

export const createBrowserId = () => {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    return UUID_PATTERN.replace(/[018]/g, (char) =>
      (
        Number(char) ^
        (cryptoApi.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)))
      ).toString(16),
    );
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
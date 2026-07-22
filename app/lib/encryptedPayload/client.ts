const ALGORITHM = "aes-256-gcm";
const DEFAULT_PAYLOAD_SECRET = "easymed-clinical-recommendations-payload-v1";

type EncryptedPayload = {
  encrypted: true;
  algorithm: typeof ALGORITHM;
  iv: string;
  tag: string;
  data: string;
};

const isEncryptedPayload = (value: unknown): value is EncryptedPayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<EncryptedPayload>;

  return (
    payload.encrypted === true &&
    payload.algorithm === ALGORITHM &&
    typeof payload.iv === "string" &&
    typeof payload.tag === "string" &&
    typeof payload.data === "string"
  );
};

const getPayloadSecret = () =>
  process.env.NEXT_PUBLIC_CLINICAL_RECOMMENDATIONS_PAYLOAD_SECRET ??
  DEFAULT_PAYLOAD_SECRET;

const decodeBase64 = (value: string) =>
  Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));

const getEncryptionKey = async () => {
  const secretBytes = new TextEncoder().encode(getPayloadSecret());
  const hash = await window.crypto.subtle.digest("SHA-256", secretBytes);

  return window.crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
};

export const decryptPayload = async <T>(payload: unknown): Promise<T> => {
  if (!isEncryptedPayload(payload)) {
    return payload as T;
  }

  const encryptedBytes = decodeBase64(payload.data);
  const tagBytes = decodeBase64(payload.tag);
  const sealedBytes = new Uint8Array(encryptedBytes.length + tagBytes.length);
  sealedBytes.set(encryptedBytes);
  sealedBytes.set(tagBytes, encryptedBytes.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(payload.iv), tagLength: 128 },
    await getEncryptionKey(),
    sealedBytes,
  );

  return JSON.parse(new TextDecoder().decode(decryptedBuffer)) as T;
};

export const fetchEncryptedJson = async <T>(input: RequestInfo | URL, init?: RequestInit) => {
  const response = await fetch(input, init);

  if (!response.ok) return { response, data: null as T | null };

  return { response, data: await decryptPayload<T>(await response.json()) };
};
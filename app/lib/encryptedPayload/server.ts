import { createCipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const DEFAULT_PAYLOAD_SECRET = "easymed-clinical-recommendations-payload-v1";

export type EncryptedPayload = {
  encrypted: true;
  algorithm: typeof ALGORITHM;
  iv: string;
  tag: string;
  data: string;
};

const getPayloadSecret = () =>
  process.env.CLINICAL_RECOMMENDATIONS_PAYLOAD_SECRET ??
  process.env.NEXT_PUBLIC_CLINICAL_RECOMMENDATIONS_PAYLOAD_SECRET ??
  DEFAULT_PAYLOAD_SECRET;

const getEncryptionKey = () =>
  createHash("sha256").update(getPayloadSecret(), "utf8").digest();

export const encryptPayload = (payload: unknown): EncryptedPayload => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const serializedPayload = JSON.stringify(payload);
  const encryptedData = Buffer.concat([
    cipher.update(serializedPayload, "utf8"),
    cipher.final(),
  ]);

  return {
    encrypted: true,
    algorithm: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encryptedData.toString("base64"),
  };
};
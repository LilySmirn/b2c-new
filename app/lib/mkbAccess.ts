import { getServerSession } from "next-auth";
import type { RowDataPacket } from "mysql2/promise";

import { authOptions } from "@/app/lib/auth";
import { pool } from "@/app/lib/db";
import { normalizeMkbCode } from "@/app/lib/mkbCodeAccess";

export { isMkbCodeAllowed } from "@/app/lib/mkbCodeAccess";

type AllowedMkbCodesRow = RowDataPacket & {
  allowed_mkb_codes: unknown;
};

const parseAllowedCodes = (value: unknown): string[] | null => {
  if (value === null) return null;

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return [...new Set(parsed.filter((code): code is string => typeof code === "string")
    .map(normalizeMkbCode)
    .filter(Boolean))];
};

export async function getCurrentUserAllowedMkbCodes(): Promise<string[] | null | undefined> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return undefined;

  const [rows] = await pool.query<AllowedMkbCodesRow[]>(
    "SELECT allowed_mkb_codes FROM users WHERE user_id = ? LIMIT 1",
    [userId],
  );

  if (!rows[0]) return undefined;

  return parseAllowedCodes(rows[0].allowed_mkb_codes);
}
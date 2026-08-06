import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

/**
 * Keep the uploaded application on the same configuration as local development.
 *
 * Next.js normally gives variables provided by the host process precedence over
 * values from env files.  That makes a stale server-level configuration win over
 * `.env`. Loading the file explicitly with `override` makes `.env` the source
 * of truth whenever it is included in the deployed project, even if a
 * `.env.local` file is also present.
 */
export function loadEnv(): boolean {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return false;
  }

  const result = dotenv.config({
    path: envPath,
    override: true,
    quiet: true,
  });

  if (result.error) {
    throw result.error;
  }

  return true;
}
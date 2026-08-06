import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";

/**
 * Keep the uploaded application on the same configuration as local development.
 *
 * Next.js normally gives variables provided by the host process precedence over
 * values from env files.  That makes a stale server-level configuration win over
 * `.env.local`.  Loading the file explicitly with `override` makes `.env.local`
 * the source of truth whenever it is included in the deployed project.
 */
export function loadLocalEnv(): boolean {
  const localEnvPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(localEnvPath)) {
    return false;
  }

  const result = dotenv.config({
    path: localEnvPath,
    override: true,
    quiet: true,
  });

  if (result.error) {
    throw result.error;
  }

  return true;
}
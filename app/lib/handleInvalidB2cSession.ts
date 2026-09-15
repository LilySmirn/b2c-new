"use client";

import { signOut } from "next-auth/react";

let invalidSessionLogout: Promise<void> | null = null;

export async function handleInvalidB2cSession(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;

  const body = await response.clone().json().catch(() => null) as {
    error?: unknown;
    reason?: unknown;
  } | null;
  if (body?.error !== "session_invalid") return false;

  if (!invalidSessionLogout) {
    invalidSessionLogout = signOut({ redirect: false })
      .catch(() => undefined)
      .then(() => {
        window.location.replace(
          body?.reason === "newer_login" ? "/login?error=session-replaced" : "/login",
        );
      });
  }

  await invalidSessionLogout;
  return true;
}
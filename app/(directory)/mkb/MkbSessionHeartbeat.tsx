"use client";

import { useEffect } from "react";

import { handleInvalidB2cSession } from "@/app/lib/handleInvalidB2cSession";

const HEARTBEAT_INTERVAL_MS = 4_000;

export default function MkbSessionHeartbeat() {
  useEffect(() => {
    let isChecking = false;
    let isStopped = false;
    let intervalId: number;

    const checkSession = async () => {
      if (isChecking || isStopped) return;

      isChecking = true;
      try {
        const response = await fetch("/api/auth/active-session", {
          cache: "no-store",
        });

        if (await handleInvalidB2cSession(response)) {
          isStopped = true;
          window.clearInterval(intervalId);
        }
      } catch {
        // A temporary network failure must not sign the user out.
      } finally {
        isChecking = false;
      }
    };

    intervalId = window.setInterval(() => {
      void checkSession();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      isStopped = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}
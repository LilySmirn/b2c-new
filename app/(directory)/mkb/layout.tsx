import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getB2cSessionStatus } from "@/app/lib/requireActiveB2cSession";
import MkbSessionHeartbeat from "./MkbSessionHeartbeat";

export default async function MkbLayout({ children }: { children: ReactNode }) {
  const { session, isActive, wasReplaced } = await getB2cSessionStatus();

  if (session?.user?.accountType === "b2c" && !isActive) {
    redirect(wasReplaced ? "/login?error=session-replaced" : "/login");
  }

  return (
    <>
      {session?.user?.accountType === "b2c" ? <MkbSessionHeartbeat /> : null}
      {children}
    </>
  );
}
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/lib/auth";
import db from "@/app/lib/db";

type ActiveB2cSession = Session & {
    user: Session["user"] & {
        id: string;
        accountType: "b2c";
    };
    sessionId: string;
};

export type B2cSessionStatus = {
    session: Session | null;
    isActive: boolean;
    wasReplaced: boolean;
};

export async function getB2cSessionStatus(): Promise<B2cSessionStatus> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const sessionId = session?.sessionId;

    const hasB2cClaims =
        session?.user?.accountType === "b2c" &&
        typeof userId === "string" &&
        userId.length > 0 &&
        typeof sessionId === "string" &&
        sessionId.length > 0;

    const isActive = hasB2cClaims
        ? await new db().hasActiveB2cSession(sessionId, userId)
        : false;

        return {
        session,
        isActive,
        wasReplaced: Boolean(hasB2cClaims && !isActive),
    };
}

export async function requireActiveB2cSession(context: "page"): Promise<ActiveB2cSession>;
export async function requireActiveB2cSession(context: "api"): Promise<ActiveB2cSession | null>;
export async function requireActiveB2cSession(
    context: "page" | "api"
): Promise<ActiveB2cSession | null> {
    const { session, isActive, wasReplaced } = await getB2cSessionStatus();

    if (!isActive) {
        if (context === "page") {
            const loginUrl = wasReplaced
                ? "/login?error=session-replaced"
                : "/login";
            redirect(loginUrl);
        }

        return null;
    }

    return session as ActiveB2cSession;
}
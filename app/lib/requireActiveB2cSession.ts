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

export async function getB2cSessionStatus(
    existingSession?: Session | null
): Promise<B2cSessionStatus> {
    const session = existingSession === undefined
        ? await getServerSession(authOptions)
        : existingSession;
    const userId = session?.user?.id;
    const sessionId = session?.sessionId;

    const hasB2cClaims =
        session?.user?.accountType === "b2c" &&
        typeof userId === "string" &&
        userId.length > 0 &&
        typeof sessionId === "string" &&
        sessionId.length > 0;

    let hasActiveDatabaseSession = false;
    let hasCurrentLogin = false;
    if (hasB2cClaims) {
        const database = new db();
        const [activeDatabaseSession, currentUser] = await Promise.all([
            database.hasActiveB2cSession(sessionId, userId),
            database.getCurrentUser(userId),
        ]);
        hasActiveDatabaseSession = activeDatabaseSession;
        // A login is part of the JWT. A changed database login makes every old
        // JWT stale, including a token opened from a different browser.
        hasCurrentLogin = currentUser?.login === session?.user?.email;
    }

    const isActive = hasB2cClaims && hasActiveDatabaseSession && hasCurrentLogin;

    return {
        session,
        isActive,
        // Only a revoked/missing user_sessions row means another device replaced
        // this login. An email change merely makes the JWT stale and must not
        // show the "new device" warning.
        wasReplaced: Boolean(hasB2cClaims && !hasActiveDatabaseSession),
    };
}

export async function requireActiveB2cSession(context: "page"): Promise<ActiveB2cSession>;
export async function requireActiveB2cSession(context: "api"): Promise<ActiveB2cSession | null>;
export async function requireActiveB2cSession(
    context: "page" | "api"
): Promise<ActiveB2cSession | null> {
    const session = await getServerSession(authOptions);

    // Page-level B2C protection must distinguish a valid B2B login from an
    // unauthenticated request. Do this before getB2cSessionStatus so B2B users
    // are not sent through the database-backed B2C single-session checks.
    if (context === "page" && session?.user?.accountType === "b2b") {
        redirect("/mkb");
    }

    const { isActive, wasReplaced } = await getB2cSessionStatus(session);

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
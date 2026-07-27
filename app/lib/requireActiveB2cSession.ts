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

export async function requireActiveB2cSession(context: "page"): Promise<ActiveB2cSession>;
export async function requireActiveB2cSession(context: "api"): Promise<ActiveB2cSession | null>;
export async function requireActiveB2cSession(
    context: "page" | "api"
): Promise<ActiveB2cSession | null> {
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

    if (!isActive) {
        if (context === "page") {
            redirect("/login");
        }

        return null;
    }

    return session as ActiveB2cSession;
}
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function POST(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
    });

    if (
        token?.accountType !== "b2c" ||
        typeof token.sub !== "string" ||
        typeof token.sessionId !== "string"
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await new db().revokeB2cSession(token.sessionId, token.sub);
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { error: "Unable to revoke session" },
            { status: 500 }
        );
    }
}
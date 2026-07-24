import { NextResponse } from "next/server";
import { checkDatabaseConnection, getUsersCount } from "@/app/lib/db";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    try {
        await checkDatabaseConnection();
        const usersCount = await getUsersCount();

        return NextResponse.json({ ok: true, usersCount });
    } catch {
        return NextResponse.json(
            { ok: false, error: "Database check failed" },
            { status: 503 }
        );
    }
}
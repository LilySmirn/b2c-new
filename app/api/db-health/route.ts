import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/app/lib/db";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return new Response("Not found", { status: 404 });
    }

    try {
        await checkDatabaseConnection();
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
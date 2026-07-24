import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/app/lib/db";

export async function GET() {
    try {
        await checkDatabaseConnection();
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
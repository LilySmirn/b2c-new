import { NextResponse } from "next/server";
import { getB2cSessionStatus } from "@/app/lib/requireActiveB2cSession";

export const dynamic = "force-dynamic";

export async function GET() {
    const { isActive, wasReplaced } = await getB2cSessionStatus();

    return NextResponse.json(
        { isActive, wasReplaced },
        { headers: { "Cache-Control": "no-store" } }
    );
}
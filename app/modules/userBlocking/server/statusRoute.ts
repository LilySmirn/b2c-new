import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/lib/auth";
import { userBlockingService } from "@/app/modules/userBlocking/server";

export async function getUserBlockingStatus() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401, headers: { "Cache-Control": "no-store" } }
        );
    }

    const blocked = await userBlockingService.isBlocked(userId);

    return NextResponse.json(
        { blocked },
        { headers: { "Cache-Control": "no-store" } }
    );
}
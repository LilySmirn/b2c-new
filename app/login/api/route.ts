
import type { NextRequest } from 'next/server';
import {getServerSession} from "next-auth";
import {redirect} from "next/navigation";
import {authOptions} from "@/app/lib/auth";

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    console.log("Session", session);

    if (session) {
        redirect("/profile");
    }

    return redirect('/login');
}

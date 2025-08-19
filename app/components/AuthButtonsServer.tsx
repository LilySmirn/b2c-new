import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import AuthButtonsClient from "./AuthButtonsClient";

export default async function AuthButtonsServer({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
    const session = await getServerSession(authOptions);
    const isLoggedIn = Boolean(session);

    return <AuthButtonsClient isLoggedIn={isLoggedIn} variant={variant} />;
}

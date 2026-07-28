import AuthButtonsClient from "./AuthButtonsClient";
import { getB2cSessionStatus } from "@/app/lib/requireActiveB2cSession";

export default async function AuthButtonsServer({ variant = 'header' }: { variant?: 'header' | 'footer' }) {
    const { isActive } = await getB2cSessionStatus();

    return <AuthButtonsClient isLoggedIn={isActive} variant={variant} />;
}

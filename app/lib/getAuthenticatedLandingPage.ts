import { getB2cSessionStatus } from "@/app/lib/requireActiveB2cSession";

export async function getAuthenticatedLandingPage(): Promise<string | null> {
    const { session, isActive } = await getB2cSessionStatus();

    if (session?.user?.accountType === "b2b") {
        return "/mkb";
    }

    if (session?.user?.accountType === "b2c" && isActive) {
        return "/profile";
    }

    return null;
}
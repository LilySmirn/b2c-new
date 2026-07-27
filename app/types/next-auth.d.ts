import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt";

type AccountType = "b2b" | "b2c";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            accountType?: AccountType;
        };
        sessionId?: string;
    }

    interface User extends DefaultUser {
        accountType: AccountType;
        sessionId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accountType?: AccountType;
        sessionId?: string;
    }
}
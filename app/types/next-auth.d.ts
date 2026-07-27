import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt";

type AccountType = "b2b" | "b2c";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            accountType?: AccountType;
        };
        /** B2C session identifier exposed at the session level, not on session.user. */
        sessionId?: string;
    }

    interface User extends DefaultUser {
        accountType: AccountType;
        /** Internal authorize() payload used to populate the JWT. */
        sessionId?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accountType?: AccountType;
        sessionId?: string;
    }
}
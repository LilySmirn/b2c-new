import type { UserBlockReasonCode } from "@/app/lib/userBlocking/types";

export type AccountType = "b2c" | "b2b";

export interface User {
    user_id: string;
    login: string;
    name: string;
    is_active?: boolean;
    password_hash?: string;
    account_type?: AccountType;
    blocked?: boolean;
    blocked_reason?: UserBlockReasonCode | null;
    blocked_at?: Date | null;
}

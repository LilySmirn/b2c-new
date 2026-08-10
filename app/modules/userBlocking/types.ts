/**
 * Stable codes stored in users.blocked_reason.
 *
 * Add new reasons here instead of scattering string literals around the app.
 * Existing values must not be renamed because they can already be persisted.
 */
export const USER_BLOCK_REASON_CODES = {
    FREQUENT_UNIQUE_CLINICAL_RECOMMENDATION_REQUESTS:
        "frequent_unique_clinical_recommendation_requests",
    EXCESSIVE_REQUESTS:
        "excessive_requests",
} as const;

export type UserBlockReasonCode =
    (typeof USER_BLOCK_REASON_CODES)[keyof typeof USER_BLOCK_REASON_CODES];

export type UserBlockState =
    | {
        blocked: false;
        blockedReason: null;
        blockedAt: null;
    }
    | {
        blocked: true;
        blockedReason: UserBlockReasonCode;
        blockedAt: Date;
    };

export interface BlockUserCommand {
    userId: string;
    reason: UserBlockReasonCode;
}

export interface UserBlockRecord {
    userId: string;
    blocked: boolean | number;
    blockedReason: string | null;
    blockedAt: Date | string | null;
}

/** Public shape returned to the browser by the blocking status endpoint. */
export interface UserBlockingStatus {
    blocked: boolean;
}
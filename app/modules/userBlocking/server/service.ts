import type { UserBlockingRepository } from "@/app/modules/userBlocking/server/repository";
import type {
    BlockUserCommand,
    UserBlockReasonCode,
    UserBlockState,
} from "../types";
import { USER_BLOCK_REASON_CODES } from "../types";

const knownReasonCodes = new Set<string>(Object.values(USER_BLOCK_REASON_CODES));

export class UserNotFoundError extends Error {
    constructor(userId: string) {
        super(`User ${userId} was not found`);
        this.name = "UserNotFoundError";
    }
}

export class InvalidUserBlockRecordError extends Error {
    constructor(userId: string) {
        super(`User ${userId} has an invalid block record`);
        this.name = "InvalidUserBlockRecordError";
    }
}

export class UserBlockingService {
    constructor(private readonly repository: UserBlockingRepository) {}

    /** Lightweight access check; block metadata is not required to deny access. */
    async isBlocked(userId: string): Promise<boolean> {
        const record = await this.repository.findByUserId(userId);

        if (record === null) {
            throw new UserNotFoundError(userId);
        }

        return Boolean(record.blocked);
    }

    async getState(userId: string): Promise<UserBlockState> {
        const record = await this.repository.findByUserId(userId);

        if (record === null) {
            throw new UserNotFoundError(userId);
        }

        if (!Boolean(record.blocked)) {
            return {
                blocked: false,
                blockedReason: null,
                blockedAt: null,
            };
        }

        if (
            record.blockedReason === null ||
            !knownReasonCodes.has(record.blockedReason) ||
            record.blockedAt === null
        ) {
            throw new InvalidUserBlockRecordError(userId);
        }

        const blockedAt = record.blockedAt instanceof Date
            ? record.blockedAt
            : new Date(record.blockedAt);

        if (Number.isNaN(blockedAt.getTime())) {
            throw new InvalidUserBlockRecordError(userId);
        }

        return {
            blocked: true,
            blockedReason: record.blockedReason as UserBlockReasonCode,
            blockedAt,
        };
    }

    async block(command: BlockUserCommand): Promise<void> {
        const updated = await this.repository.block(command);

        if (!updated) {
            throw new UserNotFoundError(command.userId);
        }
    }

    async unblock(userId: string): Promise<void> {
        const updated = await this.repository.unblock(userId);

        if (!updated) {
            throw new UserNotFoundError(userId);
        }
    }
}
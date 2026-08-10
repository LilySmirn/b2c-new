import type {
    BlockUserCommand,
    UserBlockRecord,
} from "../types";

export interface UserBlockingRepository {
    findByUserId(userId: string): Promise<UserBlockRecord | null>;
    block(command: BlockUserCommand): Promise<boolean>;
    unblock(userId: string): Promise<boolean>;
}
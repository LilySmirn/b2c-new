import type {
    BlockUserCommand,
    UserBlockRecord,
} from "@/app/lib/userBlocking/types";

export interface UserBlockingRepository {
    findByUserId(userId: string): Promise<UserBlockRecord | null>;
    block(command: BlockUserCommand): Promise<boolean>;
    unblock(userId: string): Promise<boolean>;
}
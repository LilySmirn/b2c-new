import { MysqlUserBlockingRepository } from "@/app/lib/userBlocking/mysqlUserBlockingRepository";
import { UserBlockingService } from "@/app/lib/userBlocking/service";

export { MysqlUserBlockingRepository } from "@/app/lib/userBlocking/mysqlUserBlockingRepository";
export type { UserBlockingRepository } from "@/app/lib/userBlocking/repository";
export {
    InvalidUserBlockRecordError,
    UserBlockingService,
    UserNotFoundError,
} from "@/app/lib/userBlocking/service";
export {
    USER_BLOCK_REASON_CODES,
} from "@/app/lib/userBlocking/types";
export type {
    BlockUserCommand,
    UserBlockReasonCode,
    UserBlockRecord,
    UserBlockState,
} from "@/app/lib/userBlocking/types";

export const userBlockingService = new UserBlockingService(
    new MysqlUserBlockingRepository()
);
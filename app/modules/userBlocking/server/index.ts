import { MysqlUserBlockingRepository } from "./mysqlUserBlockingRepository";
import { UserBlockingService } from "./service";

export { MysqlUserBlockingRepository } from "./mysqlUserBlockingRepository";
export type { UserBlockingRepository } from "./repository";
export {
    InvalidUserBlockRecordError,
    UserBlockingService,
    UserNotFoundError,
} from "./service";

export const userBlockingService = new UserBlockingService(
    new MysqlUserBlockingRepository()
);
import { MysqlUserBlockingRepository } from "./mysqlUserBlockingRepository";
import { UserBlockingService } from "./service";

export const userBlockingService = new UserBlockingService(
    new MysqlUserBlockingRepository()
);
import type { BlockUserCommand } from "../types";
import { userBlockingService } from "./serviceInstance";

/**
 * The single entry point for blocking a user for any reason.
 *
 * The repository performs the flag, reason and timestamp update in one SQL
 * statement. Reason detectors should call this function instead of updating
 * the users table themselves.
 */
export async function blockUser(command: BlockUserCommand): Promise<void> {
    await userBlockingService.block(command);
}
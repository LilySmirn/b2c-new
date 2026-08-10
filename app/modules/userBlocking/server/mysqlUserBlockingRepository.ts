import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/app/lib/db";
import type { UserBlockingRepository } from "./repository";
import type {
    BlockUserCommand,
    UserBlockRecord,
} from "../types";

type UserBlockRow = RowDataPacket & {
    user_id: string;
    blocked: number;
    blocked_reason: string | null;
    blocked_at: Date | string | null;
};

export class MysqlUserBlockingRepository implements UserBlockingRepository {
    async findByUserId(userId: string): Promise<UserBlockRecord | null> {
        const [rows] = await pool.query<UserBlockRow[]>(
            `SELECT user_id, blocked, blocked_reason, blocked_at
             FROM users
             WHERE user_id = ?
             LIMIT 1`,
            [userId]
        );
        const row = rows[0];

        if (row === undefined) {
            return null;
        }

        return {
            userId: row.user_id,
            blocked: row.blocked,
            blockedReason: row.blocked_reason,
            blockedAt: row.blocked_at,
        };
    }

    async block(command: BlockUserCommand): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE users
             SET blocked = TRUE,
                 blocked_reason = ?,
                 blocked_at = NOW()
             WHERE user_id = ?`,
            [command.reason, command.userId]
        );

        return result.affectedRows > 0;
    }

    async unblock(userId: string): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE users
             SET blocked = FALSE,
                 blocked_reason = NULL,
                 blocked_at = NULL
             WHERE user_id = ?`,
            [userId]
        );

        return result.affectedRows > 0;
    }
}
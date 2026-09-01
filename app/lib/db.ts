import mysql, { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {User} from "@/app/types/User";
import {Subscription} from "@/app/types/Subscription";
import {v4 as uuidv4} from "uuid";

const dbPort = Number(process.env.DB_PORT ?? 3306);

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number.isNaN(dbPort) ? 3306 : dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export const connection = pool;
export const logConnection = pool;

type ActiveSessionRow = RowDataPacket & {
    session_id: string;
    user_id: string | number;
};

type EmailVerificationRow = RowDataPacket & {
    user_id: string;
    email_verified_at: Date | string | null;
    email_verification_expires_at: Date | string | null;
};

export type SubscriptionExpirationReminder = {
    subscriptionId: string;
    expirationDate: Date;
    tariffTitle: string | null;
};

export type CurrentPayment = {
    paymentId: string;
    tariffId: string;
    tariffName: string;
    status: "pending" | "canceled";
    cancellationReason: string | null;
};

export type PaymentStatus = {
    paymentId: string;
    tariffId: string;
    tariffName: string;
    status: "pending" | "succeeded" | "canceled";
    cancellationReason: string | null;
};

export type MockPaymentResult = {
    paymentId: string;
    status: "succeeded" | "canceled";
    cancellationReason: string | null;
};

export type PaymentDetails = {
    paymentId: string;
    tariffId: string;
    tariffName: string;
    amount: number;
    status: "pending";
};

export type CreatePendingPaymentResult =
    | { outcome: "created"; payment: PaymentDetails }
    | { outcome: "already_pending"; payment: PaymentDetails }
    | { outcome: "tariff_not_found" };

export async function checkDatabaseConnection(): Promise<boolean> {
    const [rows] = await pool.query('SELECT 1 AS ok');
    return Array.isArray(rows) && rows.length > 0;
}

export async function getUsersCount(): Promise<number> {
    const [rows] = await pool.query('SELECT COUNT(*) AS users_count FROM users');
    const result = rows as { users_count: number | string }[];

    return Number(result[0]?.users_count ?? 0);
}

export default class db {
    private static emailVerificationColumnsReady = false;

    private async ensureEmailVerificationColumns(): Promise<void> {
        if (db.emailVerificationColumnsReady) {
            return;
        }

        const [columns] = await connection.query<RowDataPacket[]>(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = 'users'
               AND column_name IN (
                   'email_verified_at',
                   'email_verification_token',
                   'email_verification_expires_at'
               )`
        );
        const existingColumns = new Set(columns.map((column) => String(column.column_name)));

        if (!existingColumns.has("email_verified_at")) {
            await connection.query(`ALTER TABLE users ADD COLUMN email_verified_at datetime NULL`);
        }

        if (!existingColumns.has("email_verification_token")) {
            await connection.query(`ALTER TABLE users ADD COLUMN email_verification_token varchar(64) NULL`);
        }

        if (!existingColumns.has("email_verification_expires_at")) {
            await connection.query(`ALTER TABLE users ADD COLUMN email_verification_expires_at datetime NULL`);
        }

        const [indexes] = await connection.query<RowDataPacket[]>(
            `SELECT 1
             FROM information_schema.statistics
             WHERE table_schema = DATABASE()
               AND table_name = 'users'
               AND index_name = 'users_email_verification_token_unique'
             LIMIT 1`
        );

        if (indexes.length === 0) {
            await connection.query(
                `ALTER TABLE users
                 ADD UNIQUE KEY users_email_verification_token_unique (email_verification_token)`
            );
        }

        await connection.query(`
            UPDATE users
            SET email_verified_at = registration_date
            WHERE email_verified_at IS NULL
              AND email_verification_token IS NULL
              AND email_verification_expires_at IS NULL
        `);

        db.emailVerificationColumnsReady = true;
    }

    public async getSubscriptionExpirationReminder(
        userId: string
    ): Promise<SubscriptionExpirationReminder | null> {
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT
                s.id AS subscription_id,
                s.expiration_date,
                t.title AS tariff_title
             FROM subscriptions s
             INNER JOIN tariffs t ON t.tariff_id = s.last_paid_tariff_id
             LEFT JOIN payments p
                ON p.user_id = s.user_id
               AND p.tariff_id = s.last_paid_tariff_id
             WHERE s.user_id = ?
               AND s.id = (
                   SELECT newest.id
                   FROM subscriptions newest
                   WHERE newest.user_id = s.user_id
                   ORDER BY newest.expiration_date DESC
                   LIMIT 1
               )
               AND s.is_auto_renewal = 0
               AND s.expiration_date >= NOW()
               AND s.expiration_date <= DATE_ADD(NOW(), INTERVAL 4 DAY)
             GROUP BY s.id, s.expiration_date, t.title
             ORDER BY s.expiration_date DESC
             LIMIT 1`,
            [userId]
        );

        const reminder = rows[0] as (RowDataPacket & {
            subscription_id: string;
            expiration_date: Date | string;
            tariff_title: string | null;
        }) | undefined;

        if (!reminder) {
            return null;
        }

        return {
            subscriptionId: String(reminder.subscription_id),
            expirationDate: reminder.expiration_date instanceof Date
                ? reminder.expiration_date
                : new Date(reminder.expiration_date),
            tariffTitle: reminder.tariff_title,
        };
    }
    
    public async hasActiveB2cSession(sessionId: string, userId: string): Promise<boolean> {
        const [rows] = await connection.query<ActiveSessionRow[]>(
            `SELECT session_id, user_id
             FROM user_sessions
             WHERE session_id = ?
               AND user_id = ?
               AND revoked_at IS NULL
               AND expires_at > NOW()
             LIMIT 1`,
            [sessionId, userId]
        );

        return rows.length > 0;
    }
    
    public async getCurrentUser(id: string): Promise<User | null> {
        const [rows] = await connection.query('SELECT user_id, login, name FROM users WHERE user_id = ?', [id]);
        const users = rows as User[];

        return users[0] ?? null;
    }
    
    public async getCurrentPayment(userId: string): Promise<CurrentPayment | null> {
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT
                p.payment_id,
                p.tariff_id,
                p.status,
                p.cancellation_reason,
                t.title AS tariff_name
             FROM payments p
             INNER JOIN tariffs t ON t.tariff_id = p.tariff_id
             WHERE p.user_id = ?
               AND (
                   p.status = 'pending'
                   OR (
                       p.status = 'canceled'
                       AND p.canceled_at >= CONVERT_TZ(
                           DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')),
                           '+03:00', '+00:00'
                       )
                       AND p.canceled_at < DATE_ADD(
                           CONVERT_TZ(
                               DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')),
                               '+03:00', '+00:00'
                           ),
                           INTERVAL 1 DAY
                       )
                   )
               )
             ORDER BY
                CASE WHEN p.status = 'pending' THEN 0 ELSE 1 END,
                p.updated_at DESC,
                p.created_at DESC
             LIMIT 1`,
            [userId]
        );

        const payment = rows[0] as (RowDataPacket & {
            payment_id: string;
            tariff_id: string;
            tariff_name: string;
            status: "pending" | "canceled";
            cancellation_reason: string | null;
        }) | undefined;

        if (!payment) {
            return null;
        }

        return {
            paymentId: String(payment.payment_id),
            tariffId: String(payment.tariff_id),
            tariffName: payment.tariff_name,
            status: payment.status,
            cancellationReason: payment.cancellation_reason,
        };
    }

    public async getPaymentStatus(
        userId: string,
        paymentId: string,
    ): Promise<PaymentStatus | null> {
        const [rows] = await connection.query<RowDataPacket[]>(
            `SELECT
                p.payment_id,
                p.tariff_id,
                p.status,
                p.cancellation_reason,
                t.title AS tariff_name
             FROM payments p
             INNER JOIN tariffs t ON t.tariff_id = p.tariff_id
             WHERE p.payment_id = ?
               AND p.user_id = ?
             LIMIT 1`,
            [paymentId, userId],
        );

        const payment = rows[0] as (RowDataPacket & {
            payment_id: string;
            tariff_id: string;
            tariff_name: string;
            status: "pending" | "succeeded" | "canceled";
            cancellation_reason: string | null;
        }) | undefined;

        if (!payment) {
            return null;
        }

        return {
            paymentId: String(payment.payment_id),
            tariffId: String(payment.tariff_id),
            tariffName: payment.tariff_name,
            status: payment.status,
            cancellationReason: payment.cancellation_reason,
        };
    }

    public async applyMockPaymentStatus(
        paymentId: string,
        status: "succeeded" | "canceled",
        cancellationReason: string | null,
    ): Promise<MockPaymentResult | null> {
        const [result] = status === "succeeded"
            ? await connection.execute<ResultSetHeader>(
                `UPDATE payments
                 SET status = 'succeeded',
                     paid_at = UTC_TIMESTAMP(),
                     updated_at = UTC_TIMESTAMP(),
                     canceled_at = NULL,
                     cancellation_reason = NULL,
                     cancellation_party = NULL
                 WHERE payment_id = ?`,
                [paymentId],
            )
            : await connection.execute<ResultSetHeader>(
                `UPDATE payments
                 SET status = 'canceled',
                     paid_at = NULL,
                     updated_at = UTC_TIMESTAMP(),
                     canceled_at = UTC_TIMESTAMP(),
                     cancellation_reason = ?
                 WHERE payment_id = ?`,
                [cancellationReason, paymentId],
            );

        if (result.affectedRows === 0) {
            return null;
        }

        return {
            paymentId,
            status,
            cancellationReason: status === "canceled" ? cancellationReason : null,
        };
    }

    /**
     * Creates at most one pending payment per user.
     *
     * Locking the user's row makes the pending check and insert a serialized
     * operation for that user, including when two requests arrive together.
     */
    public async createPendingPayment(
        userId: string,
        tariffId: string,
        paymentId: string,
    ): Promise<CreatePendingPaymentResult> {
        const trx = await connection.getConnection();

        try {
            await trx.beginTransaction();

            // The user always exists for an active session. This stable row is
            // used as a per-user mutex for every payment creation transaction.
            await trx.query<RowDataPacket[]>(
                `SELECT user_id FROM users WHERE user_id = ? FOR UPDATE`,
                [userId],
            );

            const [pendingRows] = await trx.query<RowDataPacket[]>(
                `SELECT
                    p.payment_id,
                    p.tariff_id,
                    p.amount,
                    t.title AS tariff_name
                 FROM payments p
                 INNER JOIN tariffs t ON t.tariff_id = p.tariff_id
                 WHERE p.user_id = ? AND p.status = 'pending'
                 ORDER BY p.created_at DESC
                 LIMIT 1`,
                [userId],
            );
            const pending = pendingRows[0] as (RowDataPacket & {
                payment_id: string;
                tariff_id: string;
                tariff_name: string;
                amount: number | string;
            }) | undefined;

            if (pending) {
                await trx.commit();
                return {
                    outcome: "already_pending",
                    payment: {
                        paymentId: String(pending.payment_id),
                        tariffId: String(pending.tariff_id),
                        tariffName: pending.tariff_name,
                        amount: Number(pending.amount),
                        status: "pending",
                    },
                };
            }

            const [tariffRows] = await trx.query<RowDataPacket[]>(
                `SELECT tariff_id, title, price FROM tariffs WHERE tariff_id = ? LIMIT 1`,
                [tariffId],
            );
            const tariff = tariffRows[0] as (RowDataPacket & {
                tariff_id: string;
                title: string;
                price: number | string;
            }) | undefined;

            if (!tariff) {
                await trx.rollback();
                return { outcome: "tariff_not_found" };
            }

            await trx.query(
                `INSERT INTO payments (
                    user_id, tariff_id, amount, payment_id, status,
                    created_at, updated_at
                 ) VALUES (?, ?, ?, ?, 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
                [userId, tariffId, tariff.price, paymentId],
            );
            await trx.commit();

            return {
                outcome: "created",
                payment: {
                    paymentId,
                    tariffId: String(tariff.tariff_id),
                    tariffName: tariff.title,
                    amount: Number(tariff.price),
                    status: "pending",
                },
            };
        } catch (error) {
            await trx.rollback();
            throw error;
        } finally {
            trx.release();
        }
    }

    public async createUser(user: User): Promise<void> {
        const user_id = user.user_id;
        const login = user.login;
        const name = user.name;
        const password_hash = user.password_hash;

        await connection.query('INSERT INTO users (user_id, login, name, password_hash, account_type) VALUES (?, ?, ?, ?, ?)', [user_id, login, name, password_hash, user.account_type ?? 'b2c']);
    }

        /** Creates a B2B user without ever accepting or storing a plain-text password. */
    public async createB2bUser(user: {
        userId: string;
        login: string;
        passwordHash: string;
        ip: string | null;
    }): Promise<void> {
        await connection.query(
            `INSERT INTO users (user_id, login, password_hash, account_type, ip)
             VALUES (?, ?, ?, 'b2b', ?)`,
            [user.userId, user.login, user.passwordHash, user.ip]
        );
    }

    public async createB2cUserWithRequestRecord(user: User): Promise<void> {
        await this.ensureEmailVerificationColumns();
        const trx = await connection.getConnection();

        try {
            await trx.beginTransaction();
            await this.insertB2cUser(trx, user);
            await this.insertUserRequestRecord(trx, user.user_id);
            await trx.commit();
        } catch (error) {
            await trx.rollback();
            throw error;
        } finally {
            trx.release();
        }
    }

    private async insertB2cUser(trx: PoolConnection, user: User): Promise<void> {
        await trx.query(
            `INSERT INTO users (
                user_id,
                login,
                name,
                password_hash,
                account_type,
                email_verified_at,
                email_verification_token,
                email_verification_expires_at
            )
            VALUES (?, ?, ?, ?, 'b2c', NULL, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
            [user.user_id, user.login, user.name, user.password_hash, user.email_verification_token]
        );
    }

    private async insertUserRequestRecord(trx: PoolConnection, userId: string): Promise<void> {
        await trx.query(
            `INSERT INTO user_requests (user_id, current_count, last_request, total_count)
         VALUES (?, 0, NULL, 0)`,
            [userId]
        );
    }

    public async findUserByEmail(email: string): Promise<User | null> {
        await this.ensureEmailVerificationColumns();
        const [rows] = await connection.query('SELECT * FROM users WHERE login = ?', [email]) as unknown as [User[]];
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    /** Lookup used by email changes; it never performs schema-management work. */
    public async findUserByLogin(email: string): Promise<User | null> {
        const [rows] = await connection.query('SELECT * FROM users WHERE login = ? LIMIT 1', [email]);
        const users = rows as User[];
        return users[0] ?? null;
    }

     /** Password-reset lookup; unlike getCurrentUser this includes the current hash. */
    public async findUserById(userId: string): Promise<User | null> {
        const [rows] = await connection.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [userId]);
        return (rows as User[])[0] ?? null;
    }

    /** Changes only the password hash and revokes existing B2C sessions atomically. */
    public async resetUserPassword(userId: string, login: string, currentPasswordHash: string, passwordHash: string): Promise<number> {
        const trx = await connection.getConnection();
        try {
            await trx.beginTransaction();
            const [result] = await trx.query(
                'UPDATE users SET password_hash = ? WHERE user_id = ? AND login = ? AND password_hash = ?',
                [passwordHash, userId, login, currentPasswordHash]
            );
            const affectedRows = "affectedRows" in result ? Number(result.affectedRows) : 0;
            if (affectedRows === 1) {
                await trx.query(
                    'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
                    [userId]
                );
            }
            await trx.commit();
            return affectedRows;
        } catch (error) {
            await trx.rollback();
            throw error;
        } finally {
            trx.release();
        }
    }

    public async renewEmailVerificationToken(userId: string, token: string): Promise<boolean> {
        await this.ensureEmailVerificationColumns();
        const [result] = await connection.query(
            `UPDATE users
             SET email_verification_token = ?,
                 email_verification_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
             WHERE user_id = ?
               AND account_type = 'b2c'
               AND email_verified_at IS NULL
               AND (
                   email_verification_expires_at IS NULL
                   OR email_verification_expires_at <= NOW()
               )`,
            [token, userId]
        );

        return "affectedRows" in result && Number(result.affectedRows) === 1;
    }

    public async verifyUserEmail(token: string): Promise<"ok" | "expired" | "not_found"> {
        await this.ensureEmailVerificationColumns();

        const [rows] = await connection.query<EmailVerificationRow[]>(
            `SELECT user_id, email_verified_at, email_verification_expires_at
             FROM users
             WHERE email_verification_token = ?
             LIMIT 1`,
            [token]
        );

        const user = rows[0];
        if (!user) {
            return "not_found";
        }

        if (user.email_verified_at !== null) {
            return "ok";
        }

        const expiresAt = user.email_verification_expires_at instanceof Date
            ? user.email_verification_expires_at
            : new Date(user.email_verification_expires_at ?? 0);

        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
            return "expired";
        }

        await connection.query(
            `UPDATE users
             SET email_verified_at = NOW(),
                 email_verification_token = NULL,
                 email_verification_expires_at = NULL
             WHERE user_id = ?`,
            [user.user_id]
        );

        return "ok";
    }

    public async createB2cSessionReplacingExisting(params: {
        sessionId: string;
        userId: string;
        deviceId: string;
        deviceName: string | null;
        ipAddress: string | null;
        expiresAt: Date;
    }): Promise<void> {
        const trx = await connection.getConnection();

        try {
            await trx.beginTransaction();
            await trx.query(
                `SELECT user_id
                 FROM users
                 WHERE user_id = ?
                 FOR UPDATE`,
                [params.userId]
            );
            
            await trx.query(
                `UPDATE user_sessions
                 SET revoked_at = NOW()
                 WHERE user_id = ?
                   AND revoked_at IS NULL`,
                [params.userId]
            );
            await trx.query(
                `INSERT INTO user_sessions (
                    session_id,
                    user_id,
                    device_id,
                    device_name,
                    ip_address,
                    expires_at
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    params.sessionId,
                    params.userId,
                    params.deviceId,
                    params.deviceName,
                    params.ipAddress,
                    params.expiresAt,
                ]
            );
            await trx.commit();
        } catch (error) {
            await trx.rollback();
            throw error;
        } finally {
            trx.release();
        }
    }

    public async revokeB2cSession(sessionId: string, userId: string): Promise<void> {
        await connection.query(
            `UPDATE user_sessions
             SET revoked_at = NOW()
             WHERE session_id = ?
               AND user_id = ?
               AND revoked_at IS NULL`,
            [sessionId, userId]
        );
    }

    public async deleteUser(id: string): Promise<void> {
        await connection.query('DELETE FROM users WHERE user_id = ?', [id]);
    }

    public async updateUser(id: string, user: User & { password?: string }): Promise<void> {
        const fields = [];
        const values = [];

        if (user.login !== undefined) {
            fields.push('login = ?');
            values.push(user.login);
        }

        if (user.name !== undefined) {
            fields.push('name = ?');
            values.push(user.name);
        }

        if (user.password_hash !== undefined) {
            fields.push('password_hash = ?');
            values.push(user.password_hash);
        }

        if (fields.length === 0) return;

        values.push(id);

        const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
        await connection.query(query, values);
    }

    public async changeUserEmail(userId: string, oldEmail: string, newEmail: string): Promise<number> {
        const [result] = await connection.query(
            `UPDATE users
             SET login = ?
             WHERE user_id = ?
               AND login = ?`,
            [newEmail, userId, oldEmail]
        );

        return "affectedRows" in result ? Number(result.affectedRows) : 0;
    }

    public async getUserSubscriptions(userId: string): Promise<Subscription[] | null> {
        const [rows] = await connection.query(`SELECT id, s.user_id, t.title, s.expiration_date, s.is_auto_renewal FROM subscriptions s JOIN tariffs t ON s.last_paid_tariff_id = t.tariff_id WHERE s.user_id = ?`, [userId]);

        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        let subscriptions: Subscription[] = [];
        rows.forEach(row => {
            const raw = row as any;
            subscriptions.push({
                id: raw.id.toString(),
                user_id: raw.user_id.toString(),
                title: raw.title,
                expiration_date: raw.expiration_date instanceof Date
                    ? raw.expiration_date.toISOString()
                    : String(raw.expiration_date),
                is_auto_renewal: Boolean(raw.is_auto_renewal),
            });
        });

        return subscriptions;
    }

    public async getLatestUserSubscription(userId: string): Promise<Subscription | null> {
        const [rows] = await connection.query(
            `SELECT s.id, s.user_id, t.title, s.expiration_date, s.is_auto_renewal
             FROM subscriptions s
             INNER JOIN tariffs t ON t.tariff_id = s.last_paid_tariff_id
             WHERE s.user_id = ?
             ORDER BY s.expiration_date DESC, s.start_date DESC
             LIMIT 1`,
            [userId]
        );
        const [subscription] = rows as Array<{
            id: string;
            user_id: string;
            title: string | null;
            expiration_date: Date | string;
            is_auto_renewal: number | boolean;
        }>;

        if (subscription === undefined) {
            return null;
        }

        return {
            id: String(subscription.id),
            user_id: String(subscription.user_id),
            title: subscription.title ?? "",
            expiration_date: subscription.expiration_date instanceof Date
                ? subscription.expiration_date.toISOString()
                : String(subscription.expiration_date),
            is_auto_renewal: Boolean(subscription.is_auto_renewal),
        };
    }

    public async updateAutoRenewal(id: string, isEnabled: boolean): Promise<void> {
        await connection.query('UPDATE subscriptions SET is_auto_renewal = ? WHERE id = ?', [
            isEnabled ? 1 : 0,
            id,
        ]);
    }

    public async getTariffById(tariffId: string): Promise<{ duration: number } | null> {
        const [rows] = await connection.query(
            'SELECT duration FROM tariffs WHERE tariff_id = ?',
            [tariffId]
        );
        const tariffs = rows as { duration: number }[];
        return tariffs[0] ?? null;
    }

    public async getSubscription(userId: string): Promise<Subscription | null> {
        const [rows] = await connection.query(
            'SELECT * FROM subscriptions WHERE user_id = ? AND expiration_date > CURRENT_DATE()',
            [userId]
        );
        const subs = rows as Subscription[];
        return subs[0] ?? null;
    }

    public async getTariffDuration(tariffId: string): Promise<number | null> {
        const [rows] = await connection.query(
            'SELECT duration FROM tariffs WHERE tariff_id = ?',
            [tariffId]
        );
        if ((rows as any[]).length === 0) return null;
        return (rows as any[])[0].duration as number;
    }

    public async addSubscription(
        userId: string,
        tariffId: string,
        startDate: Date,
        newExpirationDate: Date
    ) : Promise<void> {
        const id = uuidv4();

        await connection.query(
            `INSERT INTO subscriptions (id, user_id, last_paid_tariff_id, start_date, expiration_date, is_auto_renewal)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, tariffId, startDate, newExpirationDate, 1]
        );
    }

    public async updateSubscription(
        id: string,
        newExpirationDate: Date
    ) : Promise<void> {
        await connection.query(
            `UPDATE subscriptions SET expiration_date = ? WHERE id = ?`,
            [newExpirationDate, id]
        );
    }

    public async getTariffName(tariffId: string): Promise<string | null> {
        const [rows] = await connection.query(
            'SELECT title FROM tariffs WHERE tariff_id = ?',
            [tariffId]
        );
        if ((rows as any[]).length === 0) return null;
        return (rows as any[])[0].title as string;
    }

    public async createUserRequestRecord(userId: string): Promise<void> {
        await connection.query(
            `INSERT INTO user_requests (user_id, current_count, last_request, total_count)
         VALUES (?, 0, NULL, 0)`,
            [userId]
        );
    }

    public async logEvent(params: {
        level: 'ERROR' | 'WARNING' | 'INFO';
        source: string;
        event_name: string;
        message: string;
        stacktrace?: string | null;
        user_id?: string | null;
    }): Promise<void> {
        const { level, source, event_name, message, stacktrace, user_id } = params;

        await logConnection.query(
            `INSERT INTO error_logs (level, source, event_name, message, stacktrace, user_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                level,
                source,
                event_name,
                message,
                stacktrace ?? null,
                user_id ?? null,
            ]
        );
    }
}



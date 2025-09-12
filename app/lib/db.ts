import mysql from 'mysql2/promise';
import {User} from "@/app/types/User";
import {Subscription} from "@/app/types/Subscription";
import {v4 as uuidv4} from "uuid";

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

export { connection };

export default class db {
    public async getCurrentUser(id: string): Promise<User | null> {
        const [rows] = await connection.query('SELECT user_id, login, name FROM users WHERE user_id = ?', [id]);
        const users = rows as User[];

        return users[0] ?? null;
    }

    public async createUser(user: User): Promise<void> {
        const user_id = user.user_id;
        const login = user.login;
        const name = user.name;
        const password_hash = user.password_hash;

        await connection.query('INSERT INTO users (user_id, login, name, password_hash) VALUES (?, ?, ?, ?)', [user_id, login, name, password_hash]);
    }

    public async findUserByEmail(email: string): Promise<User | null> {
        const [rows] = await connection.query('SELECT * FROM users WHERE login = ?', [email]) as unknown as [User[]];
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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
            [id, userId, tariffId, startDate, newExpirationDate, 0]
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

}



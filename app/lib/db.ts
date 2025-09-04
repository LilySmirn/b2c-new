import mysql from 'mysql2/promise';
import {User} from "@/app/types/User";
import {Subscription} from "@/app/types/Subscription";

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

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
        const [rows] = await connection.query(`SELECT s.tariff_id, s.user_id, t.title, s.expiration_date, s.is_auto_renewal FROM subscriptions s JOIN tariffs t ON s.tariff_id = t.tariff_id WHERE s.user_id = ? ORDER BY s.expiration_date`, [userId]);

        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        let subscriptions: Subscription[] = [];
        rows.forEach(row => {
            const raw = row as any;
            subscriptions.push({
                user_id: raw.user_id.toString(),
                tariff_id: raw.tariff_id.toString(),
                title: raw.title,
                expiration_date: raw.expiration_date instanceof Date
                    ? raw.expiration_date.toISOString()
                    : String(raw.expiration_date),
                is_auto_renewal: Boolean(raw.is_auto_renewal),
            });
        });

        return subscriptions;
    }

    public async updateAutoRenewal(userId: string, tariff_id: string, isEnabled: boolean): Promise<void> {
        await connection.query('UPDATE subscriptions SET is_auto_renewal = ? WHERE user_id = ? AND tariff_id = ?', [
            isEnabled ? 1 : 0,
            userId,
            tariff_id,
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

    public async addOrUpdateSubscription(
        userId: string,
        tariffId: string,
        expirationDate: Date,
        isAutoRenewal: boolean
    ): Promise<void> {
        const now = new Date();

        await connection.query(
            `INSERT INTO subscriptions (user_id, tariff_id, start_date, expiration_date, is_auto_renewal)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
             expiration_date = VALUES(expiration_date),
             is_auto_renewal = VALUES(is_auto_renewal)`,
            [userId, tariffId, now, expirationDate, isAutoRenewal ? 1 : 0]
        );
    }
}


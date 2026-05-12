import cron from "node-cron";
import mysql from "mysql2/promise";
import { sendMail } from "@/app/lib/mailer";

const mainConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const logConnection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "logsdb",
});

async function checkExpiringSubscriptions() {
    console.log("Запуск проверки подписок");

    try {
        await mainConnection.query(`
            DELETE FROM mail_notifications
            WHERE sent_at < NOW() - INTERVAL 30 DAY
        `);

        const [rows] = await mainConnection.query(`
            SELECT s.id AS subscription_id, s.user_id, u.login, u.name, s.expiration_date, t.title
            FROM subscriptions s
                     JOIN users u ON u.user_id = s.user_id
                     JOIN tariffs t ON t.tariff_id = s.last_paid_tariff_id
                     LEFT JOIN mail_notifications m
                               ON m.subscription_id = s.id AND m.expiration_date = s.expiration_date
            WHERE DATE(s.expiration_date) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
              AND m.id IS NULL
        `);

        const expiring = rows as {
            subscription_id: string;
            user_id: string;
            login: string;
            name: string | null;
            expiration_date: Date;
            title: string;
        }[];

        for (const sub of expiring) {
            console.log("Попытка отправки письма:", sub.login, sub.expiration_date, sub.title);

            try {
                await sendMail(
                    sub.login,
                    "Напоминание о подписке на справочник клинических рекомендаций",
                    `<p>Привет, ${sub.name || "пользователь"}!</p>
                     <p>Ваша подписка "${sub.title}" истекает ${sub.expiration_date.toISOString().slice(0,10)}.</p>
                     <p>Для продления подписки перейдите в <a href="https://klinicheskie-rekomendatsii.ru/profile">личный кабинет</a>.</p>`
                );

                await mainConnection.query(
                    `INSERT INTO mail_notifications (user_id, subscription_id, expiration_date)
                     VALUES (?, ?, ?)`,
                    [sub.user_id, sub.subscription_id, sub.expiration_date]
                );

                console.log("Письмо отправлено:", sub.login);
            } catch (err) {
                console.error("Ошибка при отправке письма:", sub.login, err);

                await logConnection.query(
                    `INSERT INTO error_logs (level, source, event_name, message, user_id)
                     VALUES (?, ?, ?, ?, ?)`,
                    ["ERROR", "cronJobs", "MailSendingFailed", String(err), sub.user_id]
                );
            }
        }
    } catch (err) {
        console.error("Ошибка в cron:", err);

        await logConnection.query(
            `INSERT INTO error_logs (level, source, event_name, message)
             VALUES (?, ?, ?, ?)`,
            ["ERROR", "cronJobs", "CheckExpiringSubscriptionsFailed", String(err)]
        );
    }
}

cron.schedule("0 10 * * *", () => {
    checkExpiringSubscriptions();
});

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export async function sendMail(to: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.verify();
        console.log("SMTP подключение успешно");
    } catch (err) {
        console.error("Ошибка подключения SMTP:", err);
        throw err;
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
    });
}

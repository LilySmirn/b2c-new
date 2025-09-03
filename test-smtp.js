import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function test() {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.verify();
        console.log("✅ SMTP подключение успешно!");
    } catch (err) {
        console.error("❌ Ошибка SMTP:", err);
    }
}

test();

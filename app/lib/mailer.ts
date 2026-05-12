import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logError, logInfo } from "@/app/lib/logger";
import { ErrorType } from "@/app/types/ErrorType";
import { InfoType } from "@/app/types/InfoType";

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
    } catch (error) {
        await logError(ErrorType.MailSendingTransporterFailed, error);
    }

    try {
        await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html, });
        await logInfo(InfoType.MailSendingSucceed, `Letter successfully sent to ${to}`);
    } catch (error) {
        await logError(ErrorType.MailSendingFailed, error);
    }
}

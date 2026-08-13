import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logError, logInfo } from "@/app/lib/logger";
import { ErrorType } from "@/app/types/ErrorType";
import { InfoType } from "@/app/types/InfoType";

dotenv.config();

function getSmtpConfig() {
    const port = Number(process.env.SMTP_PORT);
    const missingVariables = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]
        .filter((variable) => !process.env[variable]);

    if (missingVariables.length > 0 || !Number.isInteger(port) || port <= 0) {
        throw new Error(
            `SMTP configuration is invalid. Check: ${missingVariables.join(", ") || "SMTP_PORT"}`
        );
    }

    return {
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    };
}

async function reportMailError(type: ErrorType, error: unknown): Promise<void> {
    try {
        await logError(type, error);
    } catch (loggingError) {
        console.error("Could not persist mail error", loggingError);
    }
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
    let config: ReturnType<typeof getSmtpConfig>;

    try {
        config = getSmtpConfig();
    } catch (error) {
        await reportMailError(ErrorType.MailSendingTransporterFailed, error);
        throw error;
    }

    const transporter = nodemailer.createTransport({
        ...config,
    });

    try {
        await transporter.verify();
    } catch (error) {
        await reportMailError(ErrorType.MailSendingTransporterFailed, error);
        throw error;
    }

    try {
        await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html, });
        await logInfo(InfoType.MailSendingSucceed, `Letter successfully sent to ${to}`);
    } catch (error) {
        await reportMailError(ErrorType.MailSendingFailed, error);
        throw error;
    } finally {
        transporter.close();
    }
}
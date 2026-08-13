import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log("SMTP config:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  passExists: Boolean(process.env.SMTP_PASS),
});

try {
  await transporter.verify();

  console.log("✅ SMTP connection successful");
} catch (error) {
  console.error("❌ SMTP connection failed:");
  console.error(error);
  process.exit(1);
}
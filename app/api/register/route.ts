import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { User } from "@/app/types/User";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { sendMail } from "@/app/lib/mailer";
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPublicBaseUrl(req: Request): string {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, "");
    }

    const host = req.headers.get("host") ?? "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
}

function buildVerificationEmail(name: string, verificationUrl: string): string {
    return `
        <p>Здравствуйте, ${name}!</p>
        <p>Для завершения регистрации в EasyMed подтвердите адрес электронной почты.</p>
        <p><a href="${verificationUrl}">Подтвердить email</a></p>
        <p>Ссылка действует 24 часа.</p>
    `;
}

type RegisterPayload = {
    email?: unknown;
    password?: unknown;
    name?: unknown;
};

function isRegisterPayload(payload: unknown): payload is RegisterPayload {
    return Boolean(payload && typeof payload === "object");
}

function isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: unknown }).code === "ER_DUP_ENTRY"
    );
}

function validateRegisterPayload(payload: unknown) {
    const body = isRegisterPayload(payload) ? payload : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name) {
        return { error: "Name is required" };
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
        return { error: "Valid email is required" };
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    return { value: { email, password, name } };
}

export async function POST(req: Request) {
    const validation = validateRegisterPayload(await req.json().catch(() => null));

    if ("error" in validation) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { email, password, name } = validation.value;

    const database = new db();

    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
        return NextResponse.json({ error: "Пользователь с таким адресом уже существует" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    const newUser: User = {
        user_id: uuidv4(),
        login: email,
        name,
        password_hash: hashed,
        account_type: "b2c",
        email_verification_token: emailVerificationToken,
    };

    try {

    await database.createB2cUserWithRequestRecord(newUser);
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return NextResponse.json({ error: "Пользователь с таким адресом уже существует" }, { status: 400 });
        }
        throw error;
    }

    const verificationUrl = `${getPublicBaseUrl(req)}/register/verify?token=${emailVerificationToken}`;
    await sendMail(
        email,
        "Подтверждение регистрации EasyMed",
        buildVerificationEmail(name, verificationUrl)
    );

    return NextResponse.json({ ok: true });
}

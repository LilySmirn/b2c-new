import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { User } from "@/app/types/User";
import { v4 as uuidv4 } from "uuid";
import { sendMail } from "@/app/lib/mailer";
import {logError, logInfo} from "@/app/lib/logger";
import {ErrorType} from "@/app/types/ErrorType";

export async function POST(req: Request) {
    const { email, password, name } = await req.json();

    const database = new db();

    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
        await logError('Already registered', ErrorType.RegisterUserAlreadyRegistered, existingUser.user_id);
        return NextResponse.json(
            { ok: false, error: "Email уже зарегистрирован" },
            { status: 400 }
        );
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser: User = {
        user_id: uuidv4(),
        login: email,
        name: name,
        password_hash: hashed,
    };

    await database.createUser(newUser);

    try {
        await database.createUserRequestRecord(newUser.user_id);
        await logInfo('RegisterRequestRecordCreated', `Request record successfully created for ${newUser.user_id}`);
    } catch (err) {
        await logError(err, ErrorType.RegisterRequestRecordCreationFailed, newUser.user_id);
    }

    const profileUrl = "https://klinicheskie-rekomendatsii.ru/profile";
    const demoUrl = "https://easymed.pro/kr/";

    const html = `
    <h2>Добро пожаловать в EasyMed, ${name}!</h2>
    <p>Ваш логин: <b>${email}</b></p>
    <p>Ваш пароль: <b>${password}</b></p>
    <p>
      <a href="${profileUrl}">Перейти в личный кабинет</a><br>
      <a href="${demoUrl}">Попробовать демо-справочник</a>
    </p>
  `;

    // TODO: put logging inside sendMail
    try {
        await sendMail(email, "Добро пожаловать в EasyMed!", html);
        await logInfo('RegisterLetterSent', `Letter successfully sent to ${email}`);
    } catch (error) {
        await logError(error, ErrorType.RegisterLetterSendingFailed);
    }

    return NextResponse.json({ ok: true });
}

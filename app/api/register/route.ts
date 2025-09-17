import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { User } from "@/app/types/User";
import { v4 as uuidv4 } from "uuid";
import { sendMail } from "@/app/lib/mailer";

export async function POST(req: Request) {
    const { email, password, name } = await req.json();

    const database = new db();

    const existingUser = await database.findUserByEmail(email);
    if (existingUser) {
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
        console.log("Запись user_requests создана");
    } catch (err) {
        console.error("Ошибка при добавлении user_requests:", err);
    }

    const profileUrl = "http://localhost:3000/profile";
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

    try {
        await sendMail(email, "Добро пожаловать в EasyMed!", html);
        console.log("Письмо успешно отправлено на", email);
    } catch (error) {
        console.error("Ошибка отправки письма:", error);
    }

    return NextResponse.json({ ok: true });
}

import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {User} from "@/app/types/User";
import {v4 as uuidv4} from "uuid";

export async function POST(req: Request) {
    const { email, password, name } = await req.json();

    const existingUser = await new db().findUserByEmail(email);
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

    await new db().createUser(newUser);

    return NextResponse.json({ ok: true });
}

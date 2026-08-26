import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import db from "@/app/lib/db";
import {
    generateB2bPassword,
    hasValidAdminAuthorization,
    validateB2bUserPayload,
} from "@/app/lib/b2bUserProvisioning";

function isDuplicateKeyError(error: unknown): boolean {
    return Boolean(
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: unknown }).code === "ER_DUP_ENTRY"
    );
}

export async function POST(request: Request) {
    if (!hasValidAdminAuthorization(request)) {
        return NextResponse.json({ error: "Недействительные административные учетные данные" }, { status: 401 });
    }

    const validation = validateB2bUserPayload(await request.json().catch(() => null));
    if ("error" in validation) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { login, ip } = validation.value;
    const database = new db();
    const existingUser = await database.findUserByLogin(login);

    if (existingUser) {
        return NextResponse.json(
            { error: "Пользователь с таким логином уже существует" },
            { status: 409 }
        );
    }

    const password = generateB2bPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        await database.createB2bUser({
            userId: uuidv4(),
            login,
            passwordHash,
            ip,
        });
    } catch (error) {
        // The unique index remains authoritative if two requests race after the lookup.
        if (isDuplicateKeyError(error)) {
            return NextResponse.json(
                { error: "Пользователь с таким логином уже существует" },
                { status: 409 }
            );
        }
        throw error;
    }

    return NextResponse.json({ success: true, login, password }, { status: 201 });
}
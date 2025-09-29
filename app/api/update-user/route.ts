import {NextRequest, NextResponse} from 'next/server';
import bcrypt from 'bcryptjs';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/app/lib/auth';
import db from '@/app/lib/db';
import {logError, NextErrorResponse} from '@/app/lib/logger';
import {ErrorType} from "@/app/types/ErrorType";

export async function POST(req: NextRequest) {
    let userId:string | null = null;
    try {
        //throw new Error('Тестовая ошибка для проверки логирования');
        const session = await getServerSession(authOptions);
        userId = session?.user?.id ?? null;

        if (!userId) {
            return await NextErrorResponse(ErrorType.UserUpdateUnauthorized, 'Unauthorized', 401, userId);
        }

        const { name, login, password } = await req.json();

        const updateData: any = {};

        if (name?.trim()) updateData.name = name.trim();
        if (login?.trim()) updateData.login = login.trim();
        if (password?.trim()) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password.trim(), salt);
            updateData.password_hash = hash;
        }

        if (Object.keys(updateData).length === 0) {
            return await NextErrorResponse(ErrorType.UserUpdateNoFieldProvided, 'No fields provided', 400, userId);
        }

        const database = new db();
        await database.updateUser(userId, updateData);

        let freshUser = null;
        try {
            freshUser = await database.getCurrentUser(userId);
        } catch (err) {
            await logError('getCurrentUser', err, userId);
        }

        const userResponse = freshUser
            ? {
                ...freshUser,
                email: freshUser.login,
            }
            : null;

        return NextResponse.json({ success: true, user: userResponse });
    } catch (error) {
        return await NextErrorResponse(ErrorType.UserUpdateServerError, 'Internal server error', 500, userId);
    }
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import db from '@/app/lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
        }

        const database = new db();
        await database.updateUser(session.user.id, updateData);

        let freshUser = null;
        try {
            freshUser = await database.getCurrentUser(session.user.id);
        } catch (err) {
            console.error('getCurrentUser error:', err);
        }

        // Create response object with email field if user exists
        const userResponse = freshUser ? {
            ...freshUser,
            email: freshUser.login
        } : null;

        return NextResponse.json({ success: true, user: userResponse });

    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

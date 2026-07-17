import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_DIRECTORY_PREFIX = '/preview/directory';

export function middleware(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith(PROTECTED_DIRECTORY_PREFIX)) {
        const username = request.cookies.get('username')?.value;
        const password = request.cookies.get('password')?.value;

        if (!username || !password) {
            const authUrl = new URL('/auth', request.url);
            const code = request.nextUrl.searchParams.get('code');

            if (code) {
                authUrl.searchParams.set('code', code);
            }

    return NextResponse.redirect(authUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/profile', '/preview/directory/:path*'],
};

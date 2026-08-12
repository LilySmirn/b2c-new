import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/app/lib/authSecret';

const PROTECTED_DIRECTORY_PATHS = new Set([
  '/mkb',
  '/cart',
  '/access-error',
]);

const LEGACY_DIRECTORY_PATHS = new Map([
  ['/directory/search', '/mkb'],
  ['/directory/cart', '/cart'],
  ['/directory/access-error', '/access-error'],
]);

export async function middleware(request: NextRequest) {

  const legacyPath = LEGACY_DIRECTORY_PATHS.get(request.nextUrl.pathname);

  if (legacyPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (PROTECTED_DIRECTORY_PATHS.has(request.nextUrl.pathname)) {
    const token = await getToken({ req: request, secret: getAuthSecret() });
    const isB2cLogin = token?.accountType === 'b2c' && typeof token.sessionId === 'string';
    const isB2bLogin = token?.accountType === 'b2b';
    const username = request.cookies.get('username')?.value;
    const password = request.cookies.get('password')?.value;

    if ((!username || !password) && !isB2cLogin && !isB2bLogin) {
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
  matcher: [
    '/',
    '/mkb',
    '/cart',
    '/access-error',
    '/directory/search',
    '/directory/cart',
    '/directory/access-error',
  ],
};
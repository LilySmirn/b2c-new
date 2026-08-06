import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

const KLINREC_HOSTS = new Set(['klinrec.ru', 'www.klinrec.ru']);
const EASYMED_HOME_URL = 'http://klinicheskie-rekomendatsii.ru/';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (request.nextUrl.pathname === '/' && host && KLINREC_HOSTS.has(host)) {
    return NextResponse.redirect(EASYMED_HOME_URL);
  }

  const legacyPath = LEGACY_DIRECTORY_PATHS.get(request.nextUrl.pathname);

  if (legacyPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (PROTECTED_DIRECTORY_PATHS.has(request.nextUrl.pathname)) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
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
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_DIRECTORY_PATHS = new Set([
  '/directory/search',
  '/directory/cart',
  '/directory/access-error',
]);

const KLINREC_HOSTS = new Set(['klinrec.ru', 'www.klinrec.ru']);
const EASYMED_HOME_URL = 'https://easymed.pro/';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (request.nextUrl.pathname === '/' && host && KLINREC_HOSTS.has(host)) {
    return NextResponse.redirect(EASYMED_HOME_URL);
  }

  if (PROTECTED_DIRECTORY_PATHS.has(request.nextUrl.pathname)) {
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
  matcher: ['/', '/directory/search', '/directory/cart', '/directory/access-error'],
};
import { NextResponse } from 'next/server';

const LEGACY_AUTH_URL = process.env.LEGACY_AUTH_URL ?? 'https://easymed.pro/php/login.php/login';

type LegacyAuthPayload = {
  username?: unknown;
  password?: unknown;
};

function isValidCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6;
}

export async function POST(request: Request) {
  const { username, password } = (await request.json()) as LegacyAuthPayload;

  if (!isValidCredential(username) || !isValidCredential(password)) {
    return NextResponse.json({ result: 'deny' }, { status: 400 });
  }

  const legacyUrl = new URL(LEGACY_AUTH_URL);
  legacyUrl.searchParams.set('username', username);
  legacyUrl.searchParams.set('password', password);

  const legacyResponse = await fetch(legacyUrl, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!legacyResponse.ok) {
    return NextResponse.json({ result: 'error' }, { status: legacyResponse.status });
  }

  const data = await legacyResponse.json();

  return NextResponse.json(data);
}
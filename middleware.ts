import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, isSessionTokenValid } from '@/lib/server/_auth';

/**
 * Every route needs a valid session cookie except the sign-in page and the
 * two auth endpoints it calls. Everything else — HTML pages *and* /api/*
 * handlers — is gated, so an unauthenticated caller can neither read nor
 * mutate data by calling the API directly.
 */
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/logout']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await isSessionTokenValid(token)) return NextResponse.next();

  // API callers get a 401 they can act on; browsers get sent to the login page.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Sesi tamat atau tiada akses. Sila log masuk.' },
      { status: 401 }
    );
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  // Only carry same-origin paths back after login (never protocol-relative URLs).
  if (pathname.startsWith('/') && !pathname.startsWith('//')) {
    loginUrl.searchParams.set('from', pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Framework assets are public; everything else passes through this gate.
  matcher: ['/((?!_next/|favicon.ico).*)'],
};

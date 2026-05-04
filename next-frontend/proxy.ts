/**
 * Next.js Proxy
 *
 * - Route protection (redirect unauthenticated -> /login)
 * - Auth-only cookie check (no role enforcement in proxy; AuthProvider handles that)
 * - No /signup route; accounts are created by admin
 */

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/set-initial-password',
];

const PROTECTED_PREFIXES = ['/dashboard'];

function matchesRoute(pathname: string, route: string): boolean {
  if (route === '/') {
    return pathname === '/';
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

function hasRefreshCookie(request: NextRequest): boolean {
  return !!request.cookies.get('refreshToken')?.value;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasRefreshCookie(request);

  const isPublic = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    matchesRoute(pathname, prefix),
  );

  if (isPublic) return NextResponse.next();

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|public).*)'],
};

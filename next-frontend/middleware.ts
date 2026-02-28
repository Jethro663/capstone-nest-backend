/**
 * Next.js Middleware
 *
 * - Route protection (redirect unauthenticated → /login)
 * - Auth‑only cookie check (no role enforcement in middleware — AuthProvider handles that)
 * - No /signup route — accounts are created by admin
 */

import { NextRequest, NextResponse } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_ROUTES = ['/login', '/verify-email', '/forgot-password', '/reset-password', '/set-initial-password'];

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard'];

function hasRefreshCookie(request: NextRequest): boolean {
  return !!request.cookies.get('refreshToken')?.value;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isProtected = PROTECTED_PREFIXES.some((r) => pathname.startsWith(r));
  const hasSession = hasRefreshCookie(request);

  // Public route → allow (login page handles already-authenticated redirect itself)
  if (isPublic) return NextResponse.next();

  // Protected route without session → redirect to login
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root → redirect based on session
  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|public).*)'],
};

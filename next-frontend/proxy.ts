/**
 * Next.js Proxy
 *
 * - Route protection (redirect unauthenticated -> /login)
 * - Auth-only cookie check (no role enforcement in proxy; AuthProvider handles that)
 * - No /signup route; accounts are created by admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { contentSecurityPolicy } from './src/lib/security-headers';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/set-initial-password',
  '/system-maintenance',
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
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'production');
  const requestHeaders = new Headers(request.headers);
  // Overwrite client-provided values; Next.js reads this policy to nonce its scripts.
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);
  const finish = (response: NextResponse) => {
    response.headers.set(
      process.env.CSP_REPORT_ONLY === 'true'
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy',
      policy,
    );
    if (request.headers.get('accept')?.includes('text/html') || !/\.[^/]+$/.test(request.nextUrl.pathname)) {
      response.headers.set('Cache-Control', 'private, no-store');
    }
    return response;
  };
  const next = () => finish(NextResponse.next({ request: { headers: requestHeaders } }));
  const { pathname } = request.nextUrl;
  const hasSession = hasRefreshCookie(request);

  const isPublic = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    matchesRoute(pathname, prefix),
  );

  if (isPublic) return next();

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return finish(NextResponse.redirect(loginUrl));
  }

  return next();
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/static/|_next/image(?:/|$)).*)'],
};

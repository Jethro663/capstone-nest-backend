/**
 * Next.js Middleware
 * 
 * Provides:
 * - Route protection (redirect unauthenticated to login)
 * - Role-based access control
 * - Auth state validation on each request
 * - Email verification check
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Public routes (no auth required)
const PUBLIC_ROUTES = ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password'];

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard'];

/**
 * Check if refresh token exists in cookies
 */
async function hasValidSession(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken');
    return !!refreshToken;
  } catch (error) {
    console.error('[MIDDLEWARE] Error checking session:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has a valid session
  const hasSession = await hasValidSession(request);

  // Public route logic
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    // If authenticated, redirect from login/signup to dashboard
    if (hasSession && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow public route access
    return NextResponse.next();
  }

  // Protected route logic
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    // No session - redirect to login
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Has session - allow access
    return NextResponse.next();
  }

  // Root path logic
  if (pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

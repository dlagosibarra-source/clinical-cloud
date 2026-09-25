import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (replaces deprecated middleware.ts).
 *
 * Performs optimistic route protection by checking for Cognito session cookies.
 * This is a lightweight check — it does NOT validate JWT signatures.
 * Real authorization happens in the Data Access Layer (server-context.ts).
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/confirm-email'];
const PUBLIC_ROUTES = [...AUTH_ROUTES, '/api/webhooks'];

/**
 * Check if Cognito session cookies exist in the request.
 * Amplify stores tokens in cookies with the prefix:
 * CognitoIdentityServiceProvider.<clientId>
 */
function hasSessionCookie(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll();
  return allCookies.some(
    (cookie) =>
      cookie.name.startsWith('CognitoIdentityServiceProvider.') &&
      cookie.name.endsWith('.accessToken')
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = hasSessionCookie(request);

  // 1. Unauthenticated user accessing protected route → redirect to login
  if (!hasSession && !isPublicRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user accessing auth route → redirect to agenda
  if (hasSession && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/agenda', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
  ],
};

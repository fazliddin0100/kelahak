// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decodeToken } from '@/lib/jwt';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Ochiq sahifalar
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register')
  ) {
    return NextResponse.next();
  }

  // ✅ Token olish
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  const token = bearerToken || request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    const decoded = decodeToken(token);
    // decoded ichida: { userId, department, iat, exp }

    const requestHeaders = new Headers(request.headers);
    if (decoded.userId) requestHeaders.set('x-user-id', decoded.userId);

    // ✅ Role-check
    if (pathname.startsWith('/admin')) {
      // ❗ Kotibiyat ham kirishi mumkin
      if (
        decoded.department !== 'admin' &&
        decoded.department !== 'kotibiyat'
      ) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    if (pathname.startsWith('/kotibiyat')) {
      if (decoded.department !== 'kotibiyat') {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    // ✅ Agar hammasi joyida bo‘lsa → davom etadi
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    console.error('Token decode error:', err);
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/kotibiyat/:path*',
    '/admin/:path*',
    '/user/:path*',
    '/documents/:path*',
    '/document-open/:path*',
    '/document/:path*',
  ],
};

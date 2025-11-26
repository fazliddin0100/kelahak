// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decodeToken } from '@/lib/jwt';
import { offlineRateLimit } from '@/lib/simple-offline-ratelimit';
import { wafCheck } from '@/lib/waf';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract IP
  const ip: string =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  // WAF check
  const waf = wafCheck({
    ip,
    method: request.method,
    contentType: request.headers.get('content-type'),
    path: pathname,
    headers: Object.fromEntries(request.headers.entries()),
    bodyBytes: 0,
    samplePayload: Object.fromEntries(request.nextUrl.searchParams.entries()),
  });

  if (!waf.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Blocked by WAF',
        reason: waf.reason,
        rules: waf.matchedRules,
        score: waf.score,
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(waf.retryAfterSeconds ?? 900),
        },
      }
    );
  }

  // Access token
  const token =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.cookies.get('token')?.value;

  let decoded: any = null;
  const now = Math.floor(Date.now() / 1000);

  if (token) {
    try {
      decoded = decodeToken(token);
      if (decoded.exp && decoded.exp < now) {
        const response = NextResponse.redirect(
          new URL('/sign-in', request.url)
        );
        response.cookies.delete('token');
        return response;
      }
    } catch (err) {
      console.error('Token decode error:', err);
    }
  }

  // 🔑 Rate limiting: token-based vs IP-based
  const limitKey = decoded?.userId ? `user:${decoded.userId}` : `ip:${ip}`;

  let maxRequests = 30; // default for anonymous
  if (decoded?.department === 'admin') {
    maxRequests = 5000;
  } else if (decoded?.department === 'kotibiyat') {
    maxRequests = 3000;
  } else if (decoded?.userId) {
    maxRequests = 2000;
  }

  const windowMs = 60_000; // 1 minut

  const { success, retryAfter } = offlineRateLimit(
    limitKey,
    maxRequests,
    windowMs
  );
  if (!success) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Please wait and try again.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() ?? '60',
          },
        }
      );
    }
    return new NextResponse(
      `Rate limit exceeded. Wait ${retryAfter ?? 60}s and retry.`,
      { status: 429 }
    );
  }

  // Public routes
  if (
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register')
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  try {
    // 🔑 Extra check for /admin: require ref_token
    if (pathname.startsWith('/admin')) {
      const refToken = request.cookies.get('ref_token')?.value;
      if (!refToken) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }

      const refDecoded = decodeToken(refToken);
      if (refDecoded.exp && refDecoded.exp < now) {
        const response = NextResponse.redirect(
          new URL('/sign-in', request.url)
        );
        response.cookies.delete('ref_token');
        return response;
      }

      // Department check
      if (!['admin', 'kotibiyat'].includes(refDecoded.department || '')) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    if (pathname.startsWith('/kotibiyat')) {
      if (decoded.department !== 'kotibiyat') {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    const requestHeaders = new Headers(request.headers);
    if (decoded?.userId) {
      requestHeaders.set('x-user-id', decoded.userId.toString());
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    console.error('Token decode error:', err);
    const response = NextResponse.redirect(new URL('/sign-in', request.url));
    response.cookies.delete('token');
    return response;
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

import { isRequestIpBlocked } from '@/lib/ipBlocklistEdge';
import { readMainToken, readRefToken } from '@/lib/middlewareAuth';
import { isBotUserAgent, queueSecurityLog } from '@/lib/middlewareSecurityLog';
import {
  applySecurityHeaders,
  attachNonceToRequest,
  generateCspNonce,
  getRateLimitConfig,
} from '@/lib/securityHeaders';
import { COMMANDER_ROLES } from '@/lib/roles';
import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

// ================= CONFIG =================
const PUBLIC_PAGE_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/superadmin/login',
  '/superadmin/register',
];

/** Ro‘yxatdan o‘tish / kirish API (token shart emas) */
const PUBLIC_AUTH_API = [
  '/api/auth/login',
  '/api/auth/admin',
  '/api/auth/register',
  '/api/auth/check-user',
  '/api/superadmin/login',
  '/api/superadmin/register',
  '/api/superadmin/setup-status',
];

/** Middleware auth o‘tkazmaydi — route ichida kalit tekshiriladi */
const INTERNAL_API = ['/api/security/log', '/api/waf/blocked-list'];

// Qaysi yo'lga qaysi ROLLAR kira oladi
const ROLE_PERMISSIONS: Record<string, string[]> = {
  '/superadmin/panel': ['superAdmin'],
  '/api/superadmin': ['superAdmin'],
  '/api/waf': ['superAdmin'],
  '/api/users/sessions': ['admin', 'superAdmin'],
  '/admin': ['superAdmin', 'admin'],
  '/user': ['user'],
  '/kotibiyat': ['admin', 'kotibiyat'],
  '/komandir': ['komandir', ...COMMANDER_ROLES],
};

// Har bir rol login qilganda qayerga yo'naltiriladi
const ROLE_HOME: Record<string, string> = {
  superAdmin: '/superadmin/panel',
  admin: '/kotibiyat',
  user: '/user',
  kotibiyat: '/kotibiyat',
  komandir: '/komandir',
  commander: '/komandir',
  deputyCommander: '/komandir',
  departmentCommander: '/komandir',
  departmentDeputy: '/komandir',
};

// ================= RATE LIMITING =================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  ip: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; count: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, count: 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, count: entry.count };
  }

  entry.count++;
  return { allowed: true, count: entry.count };
}

// Eski yozuvlarni tozalash (xotira to'lib ketmasligi uchun)
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

// URL ichida xavfli belgilar bor-yo'qligini tekshirish
const SUSPICIOUS_PATTERNS = [
  /\.\.\//, // path traversal
  /<script/i, // XSS urinishi
  /union.*select/i, // SQL injection
  /javascript:/i, // JS injection
  /%00/, // null byte
  /eval\s*\(/i, // eval injection
];

function isSuspiciousRequest(
  pathname: string,
  searchParams: URLSearchParams
): boolean {
  const fullPath = pathname + '?' + searchParams.toString();
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(fullPath));
}

function secureResponse(
  response: NextResponse,
  pathname: string,
  nonce: string
): NextResponse {
  return applySecurityHeaders(response, { nonce, pathname });
}

function continueWithNonce(
  req: NextRequest,
  pathname: string,
  nonce: string
): NextResponse {
  const requestHeaders = attachNonceToRequest(req.headers, nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secureResponse(response, pathname, nonce);
}

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET muhit o\'zgaruvchisi topilmadi! .env.local faylini tekshiring.');
}
if (!process.env.JWT_SECRET_REFRESH) {
  throw new Error('❌ JWT_SECRET_REFRESH muhit o\'zgaruvchisi topilmadi! .env.local faylini tekshiring.');
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_REFRESH);

// ================= MIDDLEWARE =================
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_ROUTES.some((r) => pathname.startsWith(r))) return true;
  if (PUBLIC_AUTH_API.some((r) => pathname.startsWith(r))) return true;
  if (INTERNAL_API.some((r) => pathname === r)) return true;
  if (pathname === '/admin') return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const nonce = generateCspNonce();

  // 0. BLOKLANGAN IP (dev: o‘tkazib yuboriladi — tez kirish)
  if (
    process.env.NODE_ENV !== 'development' &&
    (await isRequestIpBlocked(req))
  ) {
    queueSecurityLog(req, {
      type: 'waf_block',
      message: 'Bloklangan IP',
      statusCode: 403,
    });
    if (isApi) {
      return secureResponse(
        NextResponse.json(
          { message: 'IP manzilingiz bloklangan' },
          { status: 403 }
        ),
        pathname,
        nonce
      );
    }
    return secureResponse(
      new NextResponse('Forbidden', { status: 403 }),
      pathname,
      nonce
    );
  }

  // 1. STATIC BYPASS
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/tinymce')
  ) {
    return NextResponse.next();
  }

  if (INTERNAL_API.some((r) => pathname === r)) {
    return NextResponse.next();
  }

  // Kirish / ro‘yxatdan o‘tish — rate limit va auth talab qilinmaydi
  if (isPublicPath(pathname)) {
    return continueWithNonce(req, pathname, nonce);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1';

  // 2. RATE LIMITING (himoyalangan yo‘llar uchun)
  const skipRateLimit =
    pathname === '/api/auth/access-status' ||
    (process.env.NODE_ENV === 'development' && ip === '127.0.0.1');

  if (!skipRateLimit) {
    if (Math.random() < 0.01) cleanupRateLimit();

    const rateCfg = getRateLimitConfig(pathname);
    const { allowed, count } = checkRateLimit(
      ip,
      rateCfg.limit,
      rateCfg.windowMs
    );
    if (!allowed) {
      queueSecurityLog(req, {
        type: count >= rateCfg.ddosThreshold ? 'ddos' : 'rate_limit',
        message: `So‘rovlar: ${count}/${rateCfg.limit} min`,
        statusCode: 429,
      });
      const body = isApi
        ? NextResponse.json(
            { message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' },
            { status: 429, headers: { 'Retry-After': '60' } }
          )
        : new NextResponse('Too Many Requests', {
            status: 429,
            headers: {
              'Retry-After': '60',
              'Content-Type': 'text/plain',
            },
          });
      return secureResponse(body, pathname, nonce);
    }
  }

  if (isBotUserAgent(req)) {
    queueSecurityLog(req, {
      type: 'suspicious',
      message: 'Bot / avtomat skaner',
    });
  }

  // 3. SUSPICIOUS REQUEST DETECTION
  if (isSuspiciousRequest(pathname, searchParams)) {
    queueSecurityLog(req, {
      type: 'suspicious',
      message: 'Xavfli URL naqsh',
      statusCode: 400,
    });
    return new NextResponse('Bad Request', { status: 400 });
  }

  // 5. AUTHENTICATION — avval token/sa_token, keyin ref_token (admin)
  const token = readMainToken(req);

  if (!token) {
    const refToken = readRefToken(req);
    if (refToken && (pathname.startsWith('/admin') || isApi)) {
      try {
        const verified = await jwtVerify(refToken, REFRESH_SECRET, {
          algorithms: ['HS256'],
        });
        const userId = verified.payload.userId;
        const role =
          typeof verified.payload.role === 'string' ?
            verified.payload.role
          : 'admin';

        if (userId) {
          const matchedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
            pathname.startsWith(route)
          );
          if (matchedRoute) {
            const allowedRoles = ROLE_PERMISSIONS[matchedRoute];
            if (!allowedRoles.includes(role)) {
              if (isApi) {
                return NextResponse.json(
                  { message: 'Bu API uchun ruxsat yo‘q' },
                  { status: 403 }
                );
              }
              const homePath = ROLE_HOME[role] ?? '/sign-in';
              return NextResponse.redirect(new URL(homePath, req.url));
            }
          }

          const response = continueWithNonce(req, pathname, nonce);
          response.headers.set('X-User-Id', String(userId));
          response.headers.set('X-User-Role', role);
          response.headers.set('X-Access-Approved', 'true');
          return response;
        }
      } catch {
        if (pathname.startsWith('/admin')) {
          const res = NextResponse.redirect(new URL('/admin', req.url));
          res.cookies.delete('ref_token');
          return res;
        }
        if (isApi) {
          return NextResponse.json(
            { message: 'ref_token yaroqsiz' },
            { status: 401 }
          );
        }
      }
    }

    if (isApi) {
      return NextResponse.json(
        { message: 'Avtorizatsiya talab qilinadi' },
        { status: 401 }
      );
    }
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  let payload: Record<string, unknown>;

  try {
    const verified = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    if (isApi) {
      return NextResponse.json({ message: 'Token yaroqsiz' }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL('/sign-in', req.url));
    res.cookies.delete('token');
    res.cookies.delete('sa_token');
    return res;
  }

  const role = payload.role;
  const userId = payload.userId;

  if (!role || !userId || typeof role !== 'string') {
    if (isApi) {
      return NextResponse.json(
        { message: 'Token ma’lumotlari yetarli emas' },
        { status: 401 }
      );
    }
    const res = NextResponse.redirect(new URL('/sign-in', req.url));
    res.cookies.delete('token');
    res.cookies.delete('sa_token');
    return res;
  }

  const approved = role === 'superAdmin' || payload.accessApproved === true;
  const accessHeader = approved ? 'true' : 'false';

  if (!approved) {
    if (isApi) {
      return NextResponse.json(
        { message: 'Kirish uchun ruxsat berilmagan', code: 'PENDING_APPROVAL' },
        { status: 403 }
      );
    }
    const res = NextResponse.redirect(
      new URL('/sign-in?pending=approval', req.url)
    );
    res.cookies.delete('token');
    res.cookies.delete('sa_token');
    return res;
  }

  // 6. ROLE-BASED ACCESS CONTROL (RBAC)
  const matchedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = ROLE_PERMISSIONS[matchedRoute];

    if (!allowedRoles.includes(role)) {
      const homePath = ROLE_HOME[role] ?? '/sign-in';

      // Cheksiz redirect oldini olish
      if (pathname.startsWith(homePath)) {
        return NextResponse.next();
      }

      const redirectRes = NextResponse.redirect(new URL(homePath, req.url));
      return secureResponse(redirectRes, pathname, nonce);
    }
  }

  const response = continueWithNonce(req, pathname, nonce);
  response.headers.set('X-User-Id', String(userId));
  response.headers.set('X-User-Role', String(role));
  response.headers.set('X-Access-Approved', accessHeader);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|tinymce).*)'],
};

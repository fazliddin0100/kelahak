import {
  AUTH_AUDIENCE,
  AUTH_COOKIE,
  AUTH_ISSUER,
  AUTH_KIND_ORDER,
  INTERNAL_IDENTITY_HEADERS,
  roleAllowedForKind,
} from '@/lib/authCookies';
import { getClientIp } from '@/lib/clientIp';
import { isRequestIpBlocked } from '@/lib/ipBlocklistEdge';
import { isBotUserAgent, queueSecurityLog } from '@/lib/middlewareSecurityLog';
import { consumeRateLimit } from '@/lib/rateLimit';
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
  '/api/shahobcha',
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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Bitta IP dan keladigan umumiy oqim chegarasi (NAT ortidagi idora uchun keng) */
const IP_CEILING_MULTIPLIER = 10;
const PUBLIC_AUTH_API_LIMIT_PER_MINUTE = 60;

// URL ichida xavfli belgilar bor-yo'qligini tekshirish
const SUSPICIOUS_PATTERNS = [
  /\.\.\//, // path traversal
  /<script/i, // XSS urinishi
  /union.*select/i, // SQL injection
  /javascript:/i, // JS injection
  /%00/, // null byte
  /eval\s*\(/i, // eval injection
];

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

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

/** Mijoz yuborgan identifikatsiya headerlari ilovaga hech qachon o‘tmaydi */
function sanitizedRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  for (const name of INTERNAL_IDENTITY_HEADERS) headers.delete(name);
  headers.delete('x-nonce');
  return headers;
}

function continueWithNonce(
  req: NextRequest,
  pathname: string,
  nonce: string
): NextResponse {
  const requestHeaders = attachNonceToRequest(
    sanitizedRequestHeaders(req),
    nonce
  );
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secureResponse(response, pathname, nonce);
}

/**
 * Cookie bilan autentifikatsiya qilingani uchun holatni o‘zgartiruvchi
 * so‘rovlar faqat o‘z saytimizdan kelishi shart.
 */
function isCrossSiteRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite) return fetchSite !== 'same-origin' && fetchSite !== 'none';

  const origin = req.headers.get('origin');
  if (!origin) return false;

  const allowedOrigins = (process.env.APP_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (allowedOrigins.includes(origin)) return false;

  try {
    const originHost = new URL(origin).host;
    return ![
      req.headers.get('host'),
      req.headers.get('x-forwarded-host'),
    ].includes(originHost);
  } catch {
    return true;
  }
}

function tooManyRequests(
  isApi: boolean,
  retryAfterSeconds: number
): NextResponse {
  const retryAfter = String(retryAfterSeconds || 60);
  return isApi ?
      NextResponse.json(
        { message: 'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.' },
        { status: 429, headers: { 'Retry-After': retryAfter } }
      )
    : new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': retryAfter, 'Content-Type': 'text/plain' },
      });
}

if (!process.env.JWT_SECRET) {
  throw new Error('❌ JWT_SECRET muhit o\'zgaruvchisi topilmadi! .env.local faylini tekshiring.');
}
if (!process.env.JWT_SECRET_REFRESH) {
  throw new Error('❌ JWT_SECRET_REFRESH muhit o\'zgaruvchisi topilmadi! .env.local faylini tekshiring.');
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_SECRET_REFRESH);

type Identity = {
  userId: string;
  role: string;
  accessApproved: boolean;
};

/** Imzolangan HttpOnly cookie — yagona ishonchli identifikatsiya manbai */
async function resolveIdentity(req: NextRequest): Promise<Identity | null> {
  for (const kind of AUTH_KIND_ORDER) {
    const raw = req.cookies.get(AUTH_COOKIE[kind])?.value;
    if (!raw) continue;

    try {
      const { payload } = await jwtVerify(
        raw,
        kind === 'admin' ? REFRESH_SECRET : SECRET,
        {
          algorithms: ['HS256'],
          issuer: AUTH_ISSUER,
          audience: AUTH_AUDIENCE[kind],
        }
      );
      const { userId, role, sessionId } = payload;
      if (
        typeof userId !== 'string' ||
        typeof role !== 'string' ||
        typeof sessionId !== 'string' ||
        !userId ||
        !sessionId ||
        !roleAllowedForKind(kind, role)
      ) {
        continue;
      }
      return {
        userId,
        role,
        accessApproved: role === 'superAdmin' || payload.accessApproved === true,
      };
    } catch {
      // keyingi cookie
    }
  }
  return null;
}

function clearAuthCookies(response: NextResponse): NextResponse {
  for (const kind of AUTH_KIND_ORDER) {
    response.cookies.delete(AUTH_COOKIE[kind]);
  }
  return response;
}

// ================= MIDDLEWARE =================
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_ROUTES.some((r) => matchesRoute(pathname, r))) return true;
  if (PUBLIC_AUTH_API.some((r) => pathname === r)) return true;
  if (pathname === '/admin') return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const nonce = generateCspNonce();

  // 0. Rasm optimizatori o‘chirilgan (next.config: images.unoptimized)
  if (matchesRoute(pathname, '/_next/image')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 1. STATIC BYPASS
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/tinymce')
  ) {
    return NextResponse.next();
  }

  // 2. ICHKI API — route ichida maxfiy kalit tekshiriladi
  if (INTERNAL_API.some((r) => pathname === r)) {
    return NextResponse.next({
      request: { headers: sanitizedRequestHeaders(req) },
    });
  }

  // 3. BLOKLANGAN IP (dev: o‘tkazib yuboriladi — tez kirish)
  if (
    process.env.NODE_ENV !== 'development' &&
    (await isRequestIpBlocked(req))
  ) {
    queueSecurityLog(req, {
      type: 'waf_block',
      message: 'Bloklangan IP',
      statusCode: 403,
    });
    return secureResponse(
      isApi ?
        NextResponse.json(
          { message: 'IP manzilingiz bloklangan' },
          { status: 403 }
        )
      : new NextResponse('Forbidden', { status: 403 }),
      pathname,
      nonce
    );
  }

  // 4. CSRF — boshqa saytdan kelgan o‘zgartiruvchi so‘rovlar rad etiladi
  if (isApi && !SAFE_METHODS.has(req.method) && isCrossSiteRequest(req)) {
    queueSecurityLog(req, {
      type: 'suspicious',
      message: 'Boshqa saytdan kelgan so‘rov (CSRF)',
      statusCode: 403,
    });
    return secureResponse(
      NextResponse.json(
        { message: 'So‘rov manbasi tasdiqlanmadi', code: 'CSRF_REJECTED' },
        { status: 403 }
      ),
      pathname,
      nonce
    );
  }

  const ip = getClientIp(req.headers);
  const isPublic = isPublicPath(pathname);
  const rateCfg = getRateLimitConfig(pathname);
  const skipRateLimit =
    process.env.NODE_ENV === 'development' && ip === '127.0.0.1';

  // 5. IP BO‘YICHA RATE LIMIT (ochiq yo‘llar ham kiradi)
  if (!skipRateLimit) {
    const isPublicAuthApi = isApi && isPublic;
    const ipLimit =
      isPublicAuthApi ? PUBLIC_AUTH_API_LIMIT_PER_MINUTE
      : isPublic ? rateCfg.limit
      : rateCfg.limit * IP_CEILING_MULTIPLIER;
    const ipResult = consumeRateLimit(
      isPublicAuthApi ? 'mw-ip-auth' : isApi ? 'mw-ip-api' : 'mw-ip-page',
      ip,
      ipLimit,
      rateCfg.windowMs
    );
    if (!ipResult.allowed) {
      queueSecurityLog(req, {
        type:
          ipResult.count >= ipLimit + rateCfg.ddosThreshold ? 'ddos' : 'rate_limit',
        message: `So‘rovlar: ${ipResult.count}/${ipLimit} min`,
        statusCode: 429,
      });
      return secureResponse(
        tooManyRequests(isApi, ipResult.retryAfterSeconds),
        pathname,
        nonce
      );
    }
  }

  if (isBotUserAgent(req)) {
    queueSecurityLog(req, {
      type: 'suspicious',
      message: 'Bot / avtomat skaner',
    });
  }

  // 6. SUSPICIOUS REQUEST DETECTION
  if (isSuspiciousRequest(pathname, searchParams)) {
    queueSecurityLog(req, {
      type: 'suspicious',
      message: 'Xavfli URL naqsh',
      statusCode: 400,
    });
    return secureResponse(
      new NextResponse('Bad Request', { status: 400 }),
      pathname,
      nonce
    );
  }

  // Kirish / ro‘yxatdan o‘tish — auth talab qilinmaydi
  if (isPublic) {
    return continueWithNonce(req, pathname, nonce);
  }

  // 7. AUTHENTICATION
  const identity = await resolveIdentity(req);

  if (!identity) {
    if (isApi) {
      return secureResponse(
        NextResponse.json(
          { message: 'Avtorizatsiya talab qilinadi' },
          { status: 401 }
        ),
        pathname,
        nonce
      );
    }
    const loginUrl =
      matchesRoute(pathname, '/admin') ?
        new URL('/admin', req.url)
      : new URL('/sign-in', req.url);
    if (loginUrl.pathname === '/sign-in') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return secureResponse(
      clearAuthCookies(NextResponse.redirect(loginUrl)),
      pathname,
      nonce
    );
  }

  const { role, userId } = identity;

  if (!identity.accessApproved) {
    if (isApi) {
      return secureResponse(
        NextResponse.json(
          { message: 'Kirish uchun ruxsat berilmagan', code: 'PENDING_APPROVAL' },
          { status: 403 }
        ),
        pathname,
        nonce
      );
    }
    return secureResponse(
      clearAuthCookies(
        NextResponse.redirect(new URL('/sign-in?pending=approval', req.url))
      ),
      pathname,
      nonce
    );
  }

  // 8. FOYDALANUVCHI BO‘YICHA RATE LIMIT
  if (!skipRateLimit && pathname !== '/api/auth/access-status') {
    const userResult = consumeRateLimit(
      isApi ? 'mw-user-api' : 'mw-user-page',
      userId,
      rateCfg.limit,
      rateCfg.windowMs
    );
    if (!userResult.allowed) {
      queueSecurityLog(req, {
        type: userResult.count >= rateCfg.ddosThreshold ? 'ddos' : 'rate_limit',
        message: `So‘rovlar: ${userResult.count}/${rateCfg.limit} min`,
        loginHint: userId,
        statusCode: 429,
      });
      return secureResponse(
        tooManyRequests(isApi, userResult.retryAfterSeconds),
        pathname,
        nonce
      );
    }
  }

  // 9. ROLE-BASED ACCESS CONTROL (RBAC)
  const matchedRoute = Object.keys(ROLE_PERMISSIONS).find((route) =>
    matchesRoute(pathname, route)
  );

  if (matchedRoute && !ROLE_PERMISSIONS[matchedRoute].includes(role)) {
    if (isApi) {
      return secureResponse(
        NextResponse.json(
          { message: 'Bu API uchun ruxsat yo‘q' },
          { status: 403 }
        ),
        pathname,
        nonce
      );
    }

    const homePath = ROLE_HOME[role] ?? '/sign-in';
    // Cheksiz redirect oldini olish
    if (matchesRoute(pathname, homePath)) {
      return secureResponse(
        new NextResponse('Forbidden', { status: 403 }),
        pathname,
        nonce
      );
    }
    return secureResponse(
      NextResponse.redirect(new URL(homePath, req.url)),
      pathname,
      nonce
    );
  }

  return continueWithNonce(req, pathname, nonce);
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico|tinymce).*)'],
};

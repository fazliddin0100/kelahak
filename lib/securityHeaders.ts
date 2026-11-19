import { NextResponse } from 'next/server';

/**
 * Ish kabinetlari yo'llari (CSP_EDITOR_UNSAFE_EVAL=true bo'lganda unsafe-eval shu yerda).
 * SPA: /user dan /document ga o‘tganda birinchi sahifaning CSP qoladi — shuning uchun hammasi.
 */
const UNSAFE_EVAL_ROUTE_PREFIXES = [
  '/document',
  '/document-open',
  '/user',
  '/kotibiyat',
  '/komandir',
  '/admin',
];

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isEditorRoute(pathname: string): boolean {
  return UNSAFE_EVAL_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * unsafe-eval faqat dev (HMR) uchun. Productionda TinyMCE ham usiz ishlashi tekshirilgan
 * (matn, jadval, formatlash, dialoglar). Zarurat bo'lsa: CSP_EDITOR_UNSAFE_EVAL=true —
 * u holda faqat ish kabinetlari yo'llarida beriladi.
 */
export function needsUnsafeEval(pathname: string): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  if (process.env.CSP_EDITOR_UNSAFE_EVAL === 'true') return isEditorRoute(pathname);
  return false;
}

export function buildContentSecurityPolicy(
  nonce: string,
  pathname: string
): string {
  const allowEval = needsUnsafeEval(pathname);
  const scriptParts = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (allowEval) {
    scriptParts.push("'unsafe-eval'");
  }

  const scriptDirective = scriptParts.join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptDirective}`,
    `script-src-elem ${scriptDirective}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (process.env.NODE_ENV === 'production') {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function applySecurityHeaders(
  response: NextResponse,
  options: { nonce: string; pathname: string }
): NextResponse {
  const { nonce, pathname } = options;

  response.headers.delete('X-Powered-By');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  response.headers.set(
    'Content-Security-Policy',
    buildContentSecurityPolicy(nonce, pathname)
  );

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Eskirgan XSS auditor o‘zi zaiflik manbai bo‘lgani uchun o‘chiriladi; himoya — CSP.
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export function attachNonceToRequest(
  requestHeaders: Headers,
  nonce: string
): Headers {
  const headers = new Headers(requestHeaders);
  headers.set('x-nonce', nonce);
  return headers;
}

/** API va sahifa uchun alohida limitlar */
export function getRateLimitConfig(pathname: string): {
  limit: number;
  windowMs: number;
  ddosThreshold: number;
} {
  const isApi = pathname.startsWith('/api/');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return {
      limit: isApi ? 400 : 200,
      windowMs: 60_000,
      ddosThreshold: 800,
    };
  }

  return {
    limit: isApi ? 90 : 70,
    windowMs: 60_000,
    ddosThreshold: 180,
  };
}

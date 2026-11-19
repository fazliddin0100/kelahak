/** Shared by the Edge middleware and the Node API layer — keep free of Node-only imports. */

export type AuthTokenKind = 'superadmin' | 'access' | 'admin';

export const AUTH_ISSUER = 'mezon';

/**
 * Productionda (faqat HTTPS) `__Host-` prefiksi: brauzer bunday cookie'ni faqat Secure,
 * Path=/ va Domain'siz qabul qiladi — boshqa subdomen yoki HTTP sahifa uni o'rnata olmaydi.
 */
const IS_PROD = process.env.NODE_ENV === 'production';
const HOST_PREFIX = IS_PROD ? '__Host-' : '';

export const AUTH_COOKIE: Record<AuthTokenKind, string> = {
  superadmin: `${HOST_PREFIX}sa_token`,
  access: `${HOST_PREFIX}token`,
  admin: `${HOST_PREFIX}ref_token`,
};

/** Barcha auth cookie'lari uchun bir xil atributlar (o'rnatish va o'chirishda). */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  // Ichki tizim: boshqa saytdan kelgan so'rovlarga cookie umuman qo'shilmaydi
  sameSite: 'strict' as const,
  path: '/',
};

type CookieSetter = { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => unknown } };

/** `__Host-` cookie'ni o'chirish ham Secure bilan bo'lishi shart — oddiy delete() buni bermaydi. */
export function expireAuthCookie(response: CookieSetter, name: string): void {
  response.cookies.set(name, '', { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
}

export const AUTH_AUDIENCE: Record<AuthTokenKind, string> = {
  superadmin: 'mezon:superadmin',
  access: 'mezon:access',
  admin: 'mezon:admin',
};

/** Order in which a request's credentials are tried; the first valid one wins. */
export const AUTH_KIND_ORDER: readonly AuthTokenKind[] = [
  'superadmin',
  'access',
  'admin',
];

/** Identity headers must never be accepted from the client. */
export const INTERNAL_IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-role',
  'x-access-approved',
  'x-session-id',
] as const;

export function roleAllowedForKind(kind: AuthTokenKind, role: string): boolean {
  if (kind === 'superadmin') return role === 'superAdmin';
  if (kind === 'admin') return role === 'admin' || role === 'superAdmin';
  return true;
}

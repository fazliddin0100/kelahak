/** Shared by the Edge middleware and the Node API layer — keep free of Node-only imports. */

export type AuthTokenKind = 'superadmin' | 'access' | 'admin';

export const AUTH_ISSUER = 'mezon';

export const AUTH_COOKIE: Record<AuthTokenKind, string> = {
  superadmin: 'sa_token',
  access: 'token',
  admin: 'ref_token',
};

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

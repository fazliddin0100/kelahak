import jwt, { type SignOptions } from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import {
  AUTH_AUDIENCE,
  AUTH_COOKIE,
  AUTH_COOKIE_OPTIONS,
  expireAuthCookie,
  AUTH_ISSUER,
  AUTH_KIND_ORDER,
  roleAllowedForKind,
  type AuthTokenKind,
} from '@/lib/authCookies';

const MIN_SECRET_LENGTH = 32;

export type AuthTokenPayload = {
  userId: string;
  role: string;
  department?: string;
  accessApproved: boolean;
  sessionId: string;
};

function secretFor(kind: AuthTokenKind): string {
  const name = kind === 'admin' ? 'JWT_SECRET_REFRESH' : 'JWT_SECRET';
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} muhit o‘zgaruvchisi topilmadi.`);
  }
  if (process.env.NODE_ENV === 'production' && secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} kamida ${MIN_SECRET_LENGTH} belgili tasodifiy qiymat bo‘lishi kerak.`
    );
  }
  return secret;
}

export function signAuthToken(
  kind: AuthTokenKind,
  payload: AuthTokenPayload,
  expiresIn: SignOptions['expiresIn']
): string {
  return jwt.sign(payload, secretFor(kind), {
    algorithm: 'HS256',
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE[kind],
    expiresIn,
  });
}

export function verifyAuthToken(
  kind: AuthTokenKind,
  raw: string
): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(raw, secretFor(kind), {
      algorithms: ['HS256'],
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE[kind],
    });
    if (typeof decoded !== 'object' || decoded === null) return null;

    const { userId, role, sessionId, department, accessApproved } =
      decoded as Record<string, unknown>;
    if (
      typeof userId !== 'string' ||
      typeof role !== 'string' ||
      typeof sessionId !== 'string' ||
      !userId ||
      !sessionId ||
      !roleAllowedForKind(kind, role)
    ) {
      return null;
    }

    return {
      userId,
      role,
      sessionId,
      department: typeof department === 'string' ? department : undefined,
      accessApproved: role === 'superAdmin' || accessApproved === true,
    };
  } catch {
    return null;
  }
}

/** Sets one auth cookie and clears the others so a browser holds a single identity. */
export function setAuthCookies(
  response: NextResponse,
  tokens: Partial<Record<AuthTokenKind, string>>,
  maxAgeSeconds: number
): NextResponse {
  for (const kind of AUTH_KIND_ORDER) {
    const token = tokens[kind];
    if (token) {
      response.cookies.set(AUTH_COOKIE[kind], token, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: maxAgeSeconds,
      });
    } else {
      expireAuthCookie(response, AUTH_COOKIE[kind]);
    }
  }
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  for (const kind of AUTH_KIND_ORDER) {
    expireAuthCookie(response, AUTH_COOKIE[kind]);
  }
  response.cookies.delete('csrf-token');
  return response;
}

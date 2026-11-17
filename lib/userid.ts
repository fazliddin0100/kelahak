import { NextRequest } from 'next/server';
import { AUTH_COOKIE, AUTH_KIND_ORDER } from '@/lib/authCookies';
import { verifyAuthToken } from '@/lib/authTokens';

export interface IUserDocument {
  userId: string;
  department?: string;
  role?: string;
  accessApproved?: boolean;
  sessionId?: string;
}

export type RequestIdentity = {
  userId: string;
  role: string;
  accessApproved: boolean;
  sessionId: string | null;
};

/**
 * Identity comes only from a signed HttpOnly cookie. Request headers
 * (including Authorization and x-user-*) are never trusted.
 */
export function readRequestIdentity(
  request: NextRequest
): RequestIdentity | null {
  for (const kind of AUTH_KIND_ORDER) {
    const raw = request.cookies.get(AUTH_COOKIE[kind])?.value;
    if (!raw) continue;

    const payload = verifyAuthToken(kind, raw);
    if (!payload) continue;

    return {
      userId: payload.userId,
      role: payload.role,
      accessApproved: payload.accessApproved,
      sessionId: payload.sessionId,
    };
  }
  return null;
}

export const getUserId = (request: NextRequest): string | null => {
  return readRequestIdentity(request)?.userId ?? null;
};

export const getAuthPayload = (
  request: NextRequest
): IUserDocument | null => {
  const identity = readRequestIdentity(request);
  if (!identity) return null;
  return {
    userId: identity.userId,
    role: identity.role,
    accessApproved: identity.accessApproved,
    sessionId: identity.sessionId ?? undefined,
  };
};

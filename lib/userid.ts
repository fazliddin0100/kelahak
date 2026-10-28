import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH!;

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

function readBearerOrCookie(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1] ?? null;
  }
  if (authHeader) return authHeader;

  return (
    request.cookies.get('token')?.value ??
    request.cookies.get('sa_token')?.value ??
    request.cookies.get('ref_token')?.value ??
    null
  );
}

function verifyToken(raw: string): IUserDocument | null {
  if (!raw) return null;

  const secrets = [JWT_SECRET, JWT_SECRET_REFRESH].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      return jwt.verify(raw, secret) as IUserDocument;
    } catch {
      // keyingi secret
    }
  }
  return null;
}

/** Middleware JWT tekshiruvidan keyin qo‘yilgan headerlar */
export function readMiddlewareIdentity(
  request: NextRequest
): RequestIdentity | null {
  const userId = request.headers.get('x-user-id')?.trim();
  const role = request.headers.get('x-user-role')?.trim();
  if (!userId || !role) return null;

  const accessApproved =
    request.headers.get('x-access-approved') === 'true' ||
    role === 'superAdmin';

  return { userId, role, accessApproved, sessionId: request.headers.get('x-session-id')?.trim() || null };
}

export function readRequestIdentity(
  request: NextRequest
): RequestIdentity | null {
  const fromMiddleware = readMiddlewareIdentity(request);
  if (fromMiddleware) return fromMiddleware;

  const raw = readBearerOrCookie(request);
  if (!raw) return null;

  const payload = verifyToken(raw);
  if (!payload?.userId || !payload.role) return null;

  return {
    userId: String(payload.userId),
    role: String(payload.role),
    accessApproved:
      payload.role === 'superAdmin' || payload.accessApproved === true,
    sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
  };
}

export const getUserId = (request: NextRequest): string | null => {
  return readRequestIdentity(request)?.userId ?? null;
};

export const getAuthPayload = (
  request: NextRequest
): IUserDocument | null => {
  const identity = readRequestIdentity(request);
  if (identity) {
    return {
      userId: identity.userId,
      role: identity.role,
      accessApproved: identity.accessApproved,
      sessionId: identity.sessionId ?? undefined,
    };
  }
  return null;
};

export { readBearerOrCookie, verifyToken };

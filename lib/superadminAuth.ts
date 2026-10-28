import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;
const SA_EXPIRES = (process.env.SUPERADMIN_JWT_EXPIRES_IN ||
  '8h') as SignOptions['expiresIn'];

export interface SuperAdminTokenPayload {
  userId: string;
  sessionId: string;
  role: 'superAdmin';
  accessApproved: true;
}

export function getBootstrapKey(): string {
  return process.env.SUPERADMIN_BOOTSTRAP_KEY?.trim() ?? '';
}

export function isValidBootstrapKey(key: string): boolean {
  const expected = getBootstrapKey();
  if (!expected) return false;
  return key.trim() === expected;
}

export async function countSuperAdmins(): Promise<number> {
  await connectToDatabase();
  return prisma.job.count({
    where: {
      role: { role: 'superAdmin' },
    },
  });
}

export function signSuperAdminToken(userId: string, sessionId: string): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET yo‘q');
  const payload: SuperAdminTokenPayload = {
    userId,
    sessionId,
    role: 'superAdmin',
    accessApproved: true,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SA_EXPIRES });
}

export function setSuperAdminCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set('sa_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiAuth(request, { roles: ['superAdmin'] });
  if (isAuthError(auth)) return auth;
  return { userId: auth.userId };
}

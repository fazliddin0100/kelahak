import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { signAuthToken } from '@/lib/authTokens';
import { timingSafeEqualString } from '@/lib/internalKeys';
import connectToDatabase, { prisma } from '@/lib/prisma';
import type { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const SA_EXPIRES = (process.env.SUPERADMIN_JWT_EXPIRES_IN ||
  '8h') as SignOptions['expiresIn'];

const MIN_BOOTSTRAP_KEY_LENGTH = 16;

export function getBootstrapKey(): string {
  return process.env.SUPERADMIN_BOOTSTRAP_KEY?.trim() ?? '';
}

export function isValidBootstrapKey(key: string): boolean {
  const expected = getBootstrapKey();
  if (expected.length < MIN_BOOTSTRAP_KEY_LENGTH) return false;
  return timingSafeEqualString(key.trim(), expected);
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
  return signAuthToken(
    'superadmin',
    { userId, sessionId, role: 'superAdmin', accessApproved: true },
    SA_EXPIRES
  );
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiAuth(request, { roles: ['superAdmin'] });
  if (isAuthError(auth)) return auth;
  return { userId: auth.userId };
}

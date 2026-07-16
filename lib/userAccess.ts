import {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
  roleBypassesApproval,
} from '@/lib/authConstants';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { getUserId } from '@/lib/userid';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
  roleBypassesApproval,
};

export async function getUserAccessStatus(userId: string) {
  await connectToDatabase();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { job: { include: { role: true } } },
  });

  if (!user?.job) {
    return { approved: false, role: 'user', isUserTrue: false };
  }

  const role = user.job.role.role;
  const isUserTrue = Boolean(user.job.isUserTrue);
  const approved = canLoginWithoutApproval(role, isUserTrue);

  return { approved, role, isUserTrue };
}

/** Admin panel: foydalanuvchilarni boshqarish huquqi */
export async function requireAdminOperator(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiAuth(request, {
    roles: ['admin', 'superAdmin'],
  });
  if (isAuthError(auth)) return auth;
  return { userId: auth.userId };
}

/** @deprecated getUserId o‘rniga requireApiAuth ishlating */
export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const auth = await requireApiAuth(request);
  if (isAuthError(auth)) return auth;
  return { userId: auth.userId };
}

export { getUserId };

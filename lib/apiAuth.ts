import {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
} from '@/lib/authConstants';
import { findUserById, type UserWithRelations } from '@/lib/db/user';
import connectToDatabase from '@/lib/prisma';
import { readRequestIdentity } from '@/lib/userid';
import type { DbRole } from '@/lib/roles';
import { COMMANDER_ROLES } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';

export type ApiAuthSession = {
  userId: string;
  role: DbRole | string;
  department: string;
  accessApproved: boolean;
  permissions: string[];
  user: UserWithRelations;
};

function rolesMatch(tokenRole: string, dbRole: string): boolean {
  if (tokenRole === dbRole) return true;
  if (tokenRole === 'superAdmin' && dbRole === 'superAdmin') return true;
  const commanders = COMMANDER_ROLES as readonly string[];
  if (commanders.includes(tokenRole as DbRole) && commanders.includes(dbRole as DbRole)) {
    return true;
  }
  if (tokenRole === 'komandir' && commanders.includes(dbRole as DbRole)) return true;
  if (tokenRole === 'kotibiyat' && (dbRole === 'admin' || dbRole === 'superAdmin')) {
    return true;
  }
  return false;
}

/**
 * Har bir himoyalangan API: token → userId → DB → rol → ruxsat.
 * Muvaffaqiyatsiz bo‘lsa 401/403 NextResponse qaytaradi.
 */
export async function requireApiAuth(
  request: NextRequest,
  options?: { roles?: readonly string[]; permission?: string }
): Promise<ApiAuthSession | NextResponse> {
  const identity = readRequestIdentity(request);
  if (!identity) {
    return NextResponse.json(
      { message: 'Avtorizatsiya talab qilinadi', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  if (!identity.accessApproved) {
    return NextResponse.json(
      { message: PENDING_ACCESS_MESSAGE, code: 'PENDING_APPROVAL' },
      { status: 403 }
    );
  }

  await connectToDatabase();
  const user = await findUserById(identity.userId);

  if (!user?.job?.role) {
    return NextResponse.json(
      { message: 'Foydalanuvchi topilmadi yoki faol emas', code: 'USER_NOT_FOUND' },
      { status: 401 }
    );
  }

  const dbRole = user.job.role.role;
  const department = user.job.department ?? '';
  const accessApproved = canLoginWithoutApproval(
    dbRole,
    Boolean(user.job.isUserTrue)
  );

  if (!accessApproved) {
    return NextResponse.json(
      { message: PENDING_ACCESS_MESSAGE, code: 'PENDING_APPROVAL' },
      { status: 403 }
    );
  }

  if (!rolesMatch(identity.role, dbRole)) {
    return NextResponse.json(
      { message: 'Token va foydalanuvchi ma’lumotlari mos emas', code: 'TOKEN_MISMATCH' },
      { status: 401 }
    );
  }

  if (options?.roles?.length && !options.roles.includes(dbRole)) {
    return NextResponse.json(
      { message: 'Bu amal uchun ruxsat yo‘q', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  const permissions = user.job.role.permissions ?? [];

  if (options?.permission && !permissions.includes(options.permission)) {
    return NextResponse.json(
      { message: 'Bu amal uchun ruxsat yo‘q', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  return {
    userId: user.id,
    role: dbRole,
    department,
    accessApproved: true,
    permissions,
    user,
  };
}

export function isAuthError(
  result: ApiAuthSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

import type { SignOptions } from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { setAuthCookies, signAuthToken } from '@/lib/authTokens';
import type { EimzoLoginKind } from '@/lib/eimzo/challenge';
import { createUserSession } from '@/lib/sessionFiles';
import { signSuperAdminToken } from '@/lib/superadminAuth';

type SessionUser = {
  id: string;
  job: { department: string; role: { role: string } };
};

const ACCESS_SECONDS = 5 * 60 * 60;
const ADMIN_SECONDS = 8 * 60 * 60;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '5h') as SignOptions['expiresIn'];
const JWT_REFRESH_DAY = (process.env.JWT_REFRESH_DAY || '8h') as SignOptions['expiresIn'];

/**
 * Kirish muvaffaqiyatli tugagach sessiya va HttpOnly cookie beradi.
 * Parol bilan (E-IMZO talab qilinmasa) va E-IMZO tekshiruvidan keyin bir xil ishlaydi.
 */
export async function issueLoginSession(kind: EimzoLoginKind, user: SessionUser): Promise<NextResponse> {
  const role = user.job.role.role;
  const department = user.job.department;

  if (kind === 'superadmin') {
    const sessionId = await createUserSession(user.id, ADMIN_SECONDS * 1000);
    const response = NextResponse.json(
      { role: 'superAdmin', message: 'SuperAdmin paneliga xush kelibsiz' },
      { status: 200 }
    );
    return setAuthCookies(response, { superadmin: signSuperAdminToken(user.id, sessionId) }, ADMIN_SECONDS);
  }

  if (kind === 'admin') {
    const sessionId = await createUserSession(user.id, ADMIN_SECONDS * 1000);
    const adminToken = signAuthToken(
      'admin',
      { userId: user.id, department, role, accessApproved: true, sessionId },
      JWT_REFRESH_DAY
    );
    const response = NextResponse.json({ role, department }, { status: 200 });
    return setAuthCookies(
      response,
      {
        admin: adminToken,
        ...(role === 'superAdmin' ? { superadmin: signSuperAdminToken(user.id, sessionId) } : {}),
      },
      ADMIN_SECONDS
    );
  }

  const sessionId = await createUserSession(user.id, ACCESS_SECONDS * 1000);
  const token = signAuthToken(
    'access',
    { userId: user.id, department, role, accessApproved: true, sessionId },
    JWT_EXPIRES_IN
  );
  const response = NextResponse.json({ department, role }, { status: 200 });
  return setAuthCookies(response, { access: token }, ACCESS_SECONDS);
}

// app/api/auth/admin/route.ts — superAdmin / tasdiqlangan admin uchun ref_token
import type { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

import { setAuthCookies, signAuthToken } from '@/lib/authTokens';
import {
  logLoginDenied,
  logLoginSuccess,
  verifyLoginRequest,
} from '@/lib/loginFlow';
import {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
} from '@/lib/userAccess';
import { signSuperAdminToken } from '@/lib/superadminAuth';
import { createUserSession } from '@/lib/sessionFiles';

const PATH = '/api/auth/admin';
const SESSION_SECONDS = 8 * 60 * 60;
const JWT_REFRESH_DAY = (process.env.JWT_REFRESH_DAY ||
  '8h') as SignOptions['expiresIn'];

export async function POST(request: NextRequest) {
  try {
    const verified = await verifyLoginRequest(request, PATH);
    if (!verified.ok) return verified.response;
    const { authRecord, ip, login } = verified;

    const user = authRecord.user;
    const job = user?.job;
    const role = job?.role;
    if (!user || !job || !role) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!['admin', 'superAdmin'].includes(role.role)) {
      logLoginDenied(ip, PATH, login, 'Admin panel: rol ruxsati yo‘q');
      return NextResponse.json(
        { message: 'Admin panelga faqat admin yoki superAdmin kira oladi' },
        { status: 403 }
      );
    }

    if (!canLoginWithoutApproval(role.role, Boolean(job.isUserTrue))) {
      logLoginDenied(ip, PATH, login, 'Admin panel: tasdiqlanmagan');
      return NextResponse.json(
        {
          message: PENDING_ACCESS_MESSAGE,
          code: 'PENDING_APPROVAL',
        },
        { status: 403 }
      );
    }

    const sessionId = await createUserSession(user.id, SESSION_SECONDS * 1000);
    const adminToken = signAuthToken(
      'admin',
      {
        userId: user.id,
        department: job.department,
        role: role.role,
        accessApproved: true,
        sessionId,
      },
      JWT_REFRESH_DAY
    );

    logLoginSuccess(ip, PATH, login);

    const response = NextResponse.json(
      { role: role.role, department: job.department },
      { status: 200 }
    );
    return setAuthCookies(
      response,
      {
        admin: adminToken,
        ...(role.role === 'superAdmin' ?
          { superadmin: signSuperAdminToken(user.id, sessionId) }
        : {}),
      },
      SESSION_SECONDS
    );
  } catch (error) {
    console.error('Admin login xatosi:', error);
    return NextResponse.json(
      { message: 'Tizimga kirishda xatolik' },
      { status: 500 }
    );
  }
}

// app/api/auth/login/route.ts
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
import { createUserSession } from '@/lib/sessionFiles';

const PATH = '/api/auth/login';
const SESSION_SECONDS = 5 * 60 * 60;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  '5h') as SignOptions['expiresIn'];

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

    if (!canLoginWithoutApproval(role.role, Boolean(job.isUserTrue))) {
      logLoginDenied(ip, PATH, login, 'Tasdiqlanmagan foydalanuvchi');
      return NextResponse.json(
        {
          message: PENDING_ACCESS_MESSAGE,
          code: 'PENDING_APPROVAL',
        },
        { status: 403 }
      );
    }

    const sessionId = await createUserSession(user.id, SESSION_SECONDS * 1000);
    const token = signAuthToken(
      'access',
      {
        userId: user.id,
        department: job.department,
        role: role.role,
        accessApproved: true,
        sessionId,
      },
      JWT_EXPIRES_IN
    );

    logLoginSuccess(ip, PATH, login);

    const response = NextResponse.json(
      { department: job.department, role: role.role },
      { status: 200 }
    );
    return setAuthCookies(response, { access: token }, SESSION_SECONDS);
  } catch (error) {
    console.error('Login xatosi:', error);
    return NextResponse.json(
      { message: 'Tizimga kirishda xatolik' },
      { status: 500 }
    );
  }
}

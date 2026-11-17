import { setAuthCookies } from '@/lib/authTokens';
import {
  logLoginDenied,
  logLoginSuccess,
  verifyLoginRequest,
} from '@/lib/loginFlow';
import { signSuperAdminToken } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';
import { createUserSession } from '@/lib/sessionFiles';

const PATH = '/api/superadmin/login';
const SESSION_SECONDS = 8 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const verified = await verifyLoginRequest(request, PATH);
    if (!verified.ok) return verified.response;
    const { authRecord, ip, login } = verified;

    const user = authRecord.user;
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (user.job?.role?.role !== 'superAdmin') {
      logLoginDenied(ip, PATH, login, 'SuperAdmin emas');
      return NextResponse.json(
        {
          message:
            'Bu kirish faqat SuperAdmin uchun. Oddiy foydalanuvchilar /sign-in dan kiring.',
          code: 'NOT_SUPERADMIN',
        },
        { status: 403 }
      );
    }

    const sessionId = await createUserSession(user.id, SESSION_SECONDS * 1000);
    const token = signSuperAdminToken(user.id, sessionId);

    logLoginSuccess(ip, PATH, login);

    const response = NextResponse.json(
      {
        role: 'superAdmin',
        message: 'SuperAdmin paneliga xush kelibsiz',
      },
      { status: 200 }
    );

    return setAuthCookies(response, { superadmin: token }, SESSION_SECONDS);
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

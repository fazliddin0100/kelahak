// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { isEimzoRequired, startEimzoChallenge } from '@/lib/eimzo/challenge';
import { issueLoginSession } from '@/lib/loginSession';
import {
  logLoginDenied,
  logLoginSuccess,
  verifyLoginRequest,
} from '@/lib/loginFlow';
import {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
} from '@/lib/userAccess';

const PATH = '/api/auth/login';

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

    // Faol sertifikati bor userga parolning o'zi yetarli emas — E-IMZO bosqichi
    if (await isEimzoRequired(user.id)) {
      return startEimzoChallenge(user.id, 'access');
    }

    logLoginSuccess(ip, PATH, login);
    return issueLoginSession('access', user as Parameters<typeof issueLoginSession>[1]);
  } catch (error) {
    console.error('Login xatosi:', error);
    return NextResponse.json(
      { message: 'Tizimga kirishda xatolik' },
      { status: 500 }
    );
  }
}

import { isEimzoRequired, startEimzoChallenge } from '@/lib/eimzo/challenge';
import { issueLoginSession } from '@/lib/loginSession';
import {
  logLoginDenied,
  logLoginSuccess,
  verifyLoginRequest,
} from '@/lib/loginFlow';
import { NextRequest, NextResponse } from 'next/server';

const PATH = '/api/superadmin/login';

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

    if (await isEimzoRequired(user.id)) {
      return startEimzoChallenge(user.id, 'superadmin');
    }

    logLoginSuccess(ip, PATH, login);
    return issueLoginSession('superadmin', user as Parameters<typeof issueLoginSession>[1]);
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

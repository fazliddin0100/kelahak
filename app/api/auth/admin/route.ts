// app/api/auth/admin/route.ts — superAdmin / tasdiqlangan admin uchun ref_token
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

const PATH = '/api/auth/admin';

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

    if (await isEimzoRequired(user.id)) {
      return startEimzoChallenge(user.id, 'admin');
    }

    logLoginSuccess(ip, PATH, login);
    return issueLoginSession('admin', user as Parameters<typeof issueLoginSession>[1]);
  } catch (error) {
    console.error('Admin login xatosi:', error);
    return NextResponse.json(
      { message: 'Tizimga kirishda xatolik' },
      { status: 500 }
    );
  }
}

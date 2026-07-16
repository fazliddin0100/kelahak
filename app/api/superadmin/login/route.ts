import bcrypt from 'bcryptjs';
import { findUserByLogin } from '@/lib/db/user';
import { getClientIp, logSecurityEvent } from '@/lib/securityLog';
import { setSuperAdminCookie, signSuperAdminToken } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';
import validator from 'validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = typeof body.login === 'string' ? body.login : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Login va parol kerak' },
        { status: 400 }
      );
    }

    const cleanLogin = validator.trim(validator.escape(login)).toLowerCase();
    const cleanPassword = validator.trim(password);
    const ip = getClientIp(request.headers);
    const logFail = (message: string, statusCode: number) => {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/superadmin/login',
        method: 'POST',
        loginHint: cleanLogin,
        message,
        statusCode,
      });
    };

    const authRow = await findUserByLogin(cleanLogin);
    if (!authRow) {
      logFail('SuperAdmin login topilmadi', 401);
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(cleanPassword, authRow.password);
    if (!valid) {
      logFail('SuperAdmin parol noto‘g‘ri', 401);
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    const user = authRow.user;
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (user.job?.role?.role !== 'superAdmin') {
      logFail('SuperAdmin emas', 403);
      return NextResponse.json(
        {
          message:
            'Bu kirish faqat SuperAdmin uchun. Oddiy foydalanuvchilar /sign-in dan kiring.',
          code: 'NOT_SUPERADMIN',
        },
        { status: 403 }
      );
    }

    const token = signSuperAdminToken(user.id);
    const response = NextResponse.json(
      {
        token,
        role: 'superAdmin',
        message: 'SuperAdmin paneliga xush kelibsiz',
      },
      { status: 200 }
    );

    return setSuperAdminCookie(response, token);
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

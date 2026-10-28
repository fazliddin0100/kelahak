// app/api/auth/admin/route.ts — superAdmin / tasdiqlangan admin uchun ref_token
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import validator from 'validator';

import { findUserByLogin } from '@/lib/db/user';
import {
  canLoginWithoutApproval,
  PENDING_ACCESS_MESSAGE,
} from '@/lib/userAccess';
import { getClientIp, logSecurityEvent } from '@/lib/securityLog';
import {
  setSuperAdminCookie,
  signSuperAdminToken,
} from '@/lib/superadminAuth';
import { createUserSession } from '@/lib/sessionFiles';

const rateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});

const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH!;
const JWT_REFRESH_DAY = (process.env.JWT_REFRESH_DAY ||
  '3h') as SignOptions['expiresIn'];

if (!JWT_SECRET_REFRESH) {
  throw new Error('JWT_SECRET_REFRESH .env da yo‘q!');
}

interface JWTPayload {
  userId: string;
  department: string;
  role: string;
  accessApproved: true;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);

    const body = (await request.json()) as Record<string, unknown>;
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

    if (!validator.isLength(cleanLogin, { min: 3, max: 50 })) {
      return NextResponse.json(
        { message: 'Login 3-50 belgi oralig‘ida bo‘lishi kerak' },
        { status: 400 }
      );
    }

    try {
      await rateLimiter.consume(ip);
    } catch (rej) {
      const rejected = rej as { msBeforeNext?: number };
      const retryAfter = Math.ceil((rejected.msBeforeNext ?? 60000) / 1000) || 60;
      void logSecurityEvent({
        type: 'rate_limit',
        ip,
        path: '/api/auth/admin',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Admin login rate limit',
        statusCode: 429,
      });
      return NextResponse.json(
        { message: `Juda ko‘p urinish. Iltimos ${retryAfter}s kuting` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const authRow = await findUserByLogin(cleanLogin);
    if (!authRow) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/admin',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Admin panel: login topilmadi',
        statusCode: 401,
      });
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(cleanPassword, authRow.password);
    if (!isValid) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/admin',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Admin panel: parol noto‘g‘ri',
        statusCode: 401,
      });
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

    const job = user.job;
    const role = job?.role;
    if (!job || !role) {
      return NextResponse.json(
        { message: 'Foydalanuvchi roli topilmadi' },
        { status: 500 }
      );
    }

    if (!['admin', 'superAdmin'].includes(role.role)) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/admin',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Admin panel: rol ruxsati yo‘q',
        statusCode: 403,
      });
      return NextResponse.json(
        { message: 'Admin panelga faqat admin yoki superAdmin kira oladi' },
        { status: 403 }
      );
    }

    if (!canLoginWithoutApproval(role.role, Boolean(job.isUserTrue))) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/admin',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Admin panel: tasdiqlanmagan',
        statusCode: 403,
      });
      return NextResponse.json(
        {
          message: PENDING_ACCESS_MESSAGE,
          code: 'PENDING_APPROVAL',
        },
        { status: 403 }
      );
    }

    const sessionId = await createUserSession(user.id, 8 * 60 * 60 * 1000);
    const payload: JWTPayload = {
      userId: user.id,
      department: job.department,
      role: role.role,
      accessApproved: true,
      sessionId,
    };

    const ref_token = jwt.sign(payload, JWT_SECRET_REFRESH, {
      expiresIn: JWT_REFRESH_DAY,
    });

    if (role.role === 'superAdmin') {
      const saToken = signSuperAdminToken(user.id, sessionId);
      const response = NextResponse.json(
        { ref_token, token: saToken, role: role.role },
        { status: 200 }
      );
      return setSuperAdminCookie(response, saToken);
    }

    return NextResponse.json({ ref_token, role: role.role }, { status: 200 });
  } catch (error) {
    console.error('Admin login xatosi:', error);
    return NextResponse.json(
      { message: 'Foydalanuvchini olishda xatolik' },
      { status: 500 }
    );
  }
}

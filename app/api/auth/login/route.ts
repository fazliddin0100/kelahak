// app/api/auth/login/route.ts
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
import { logSecurityEvent, getClientIp } from '@/lib/securityLog';
import { createUserSession } from '@/lib/sessionFiles';

const rateLimiter = new RateLimiterMemory({
  points: process.env.NODE_ENV === 'development' ? 30 : 8,
  duration: 15 * 60,
});

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  '5h') as SignOptions['expiresIn'];

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET .env da yo‘q!');
}

interface JWTPayload {
  userId: string;
  department: string;
  role: string;
  accessApproved: boolean;
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
    if (!validator.isAlphanumeric(cleanLogin, 'en-US', { ignore: '_-' })) {
      return NextResponse.json(
        { message: "Login faqat harf, raqam, '_' yoki '-' bo‘lishi mumkin" },
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
        path: '/api/auth/login',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Login rate limit',
        statusCode: 429,
      });
      return NextResponse.json(
        { message: `Juda ko‘p urinish. Iltimos ${retryAfter}s kuting` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const authRecord = await findUserByLogin(cleanLogin);
    if (!authRecord) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/login',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Login topilmadi',
        statusCode: 401,
      });
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(cleanPassword, authRecord.password);
    if (!isValid) {
      void logSecurityEvent({
        type: 'login_failed',
        ip,
        path: '/api/auth/login',
        method: 'POST',
        loginHint: cleanLogin,
        message: 'Parol noto‘g‘ri',
        statusCode: 401,
      });
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    const user = authRecord.user;
    const job = user?.job;
    const role = job?.role;

    if (!user || !job || !role) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const accessApproved = canLoginWithoutApproval(
      role.role,
      Boolean(job.isUserTrue)
    );

    if (!accessApproved) {
      return NextResponse.json(
        {
          message: PENDING_ACCESS_MESSAGE,
          code: 'PENDING_APPROVAL',
        },
        { status: 403 }
      );
    }

    const sessionId = await createUserSession(user.id, 5 * 60 * 60 * 1000);
    const payload: JWTPayload = {
      userId: user.id,
      department: job.department,
      role: role.role,
      accessApproved: true,
      sessionId,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const response = NextResponse.json(
      {
        token,
        department: job.department,
        role: role.role,
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 5,
    });

    return response;
  } catch (error) {
    console.error('Login xatosi:', error);
    return NextResponse.json(
      { message: 'Foydalanuvchini olishda xatolik' },
      { status: 500 }
    );
  }
}

// app/api/auth/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import validator from 'validator';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import Auth from '@/models/Auth';
import User from '@/models/User';
import Job from '@/models/Job';
import Role from '@/models/Role';
import { getUserId } from '@/lib/userid';
import connectToDatabase from '@/lib/mongodb';

// Rate limiter: 5 urinish 15 daqiqa ichida (moslashtirish mumkin)
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
}

export async function POST(request: NextRequest) {
  try {
    // 1) IPni olish (x-forwarded-for mavjud bo'lsa foydalanamiz)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // 2) Body
    const body = (await request.json()) as Record<string, unknown>;
    const login = typeof body.login === 'string' ? body.login : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!login || !password) {
      return NextResponse.json(
        { message: 'Login va parol kerak' },
        { status: 400 }
      );
    }

    // 3) Sanitizatsiya
    const cleanLogin = validator.trim(validator.escape(login)).toLowerCase();
    const cleanPassword = validator.trim(password);

    // 4) Validatsiya
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

    // 5) Rate limit tekshiruvi
    try {
      await rateLimiter.consume(ip);
    } catch (rej) {
      const rejected = rej as any;
      const retryAfter = Math.ceil(rejected.msBeforeNext / 1000) || 60;
      return NextResponse.json(
        { message: `Juda ko‘p urinish. Iltimos ${retryAfter}s kuting` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    // 6) DB ga ulanish
    await connectToDatabase();

    const userId = getUserId(request);

    // 7) User topish va kerakli populate
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }
    const job = await Job.findById(user?.job);
    // 8) role
    const role = await Role.findById(job?.role);
    if (job?.department !== 'kotibiyat' && role?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Sizga kirish huquqi berilmagan!' },
        { status: 403 }
      );
    }

    // 9) Auth topish (parolni ham selekt qilish)
    const auth = await Auth.findOne({ login: cleanLogin }).select('+password');
    if (!auth) {
      // Bad credentials — lekin xavfsizlik uchun umumiy xabar
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }
    // 10) userni solishtiramiz
    if (user.auth?._id.toString() !== auth._id.toString()) {
      return NextResponse.json(
        { message: 'Sizga kirish huquqi berilmagan!' },
        { status: 401 }
      );
    }

    // 8) Parol tekshirish
    const isValid = await bcrypt.compare(cleanPassword, auth.password);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Noto‘g‘ri login yoki parol' },
        { status: 401 }
      );
    }

    // 10) JWT yaratish
    const payload: JWTPayload = {
      userId: user._id.toString(),
      department: job.department,
    };

    const ref_token = jwt.sign(payload, JWT_SECRET_REFRESH, {
      expiresIn: JWT_REFRESH_DAY,
    });

    return NextResponse.json(
      {
        ref_token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('User topishda xatolik:', error);
    return NextResponse.json(
      { message: 'Foydalanuvchini olishda xatolik' },
      { status: 500 }
    );
  }
}

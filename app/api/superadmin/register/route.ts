import { setAuthCookies } from '@/lib/authTokens';
import { getClientIp } from '@/lib/clientIp';
import { createDbId } from '@/lib/db/document';
import { hashPassword, validateNewPassword } from '@/lib/passwordPolicy';
import { prisma } from '@/lib/prisma';
import { consumeRateLimit } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/securityLog';
import { createUserSession } from '@/lib/sessionFiles';
import {
  countSuperAdmins,
  signSuperAdminToken,
} from '@/lib/superadminAuth';
import { getPermissionsForRole } from '@/helpers/PermissionsForRole';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import validator from 'validator';

const PATH = '/api/superadmin/register';
const SESSION_SECONDS = 8 * 60 * 60;
const ATTEMPTS_PER_IP = process.env.NODE_ENV === 'development' ? 100 : 5;

/** PostgreSQL advisory lock — bir vaqtda ikkita SuperAdmin yaratilmasin. */
const SUPERADMIN_LOCK_KEY = 847231001;

/** Har bir satr maydoni uchun maksimal uzunlik (Personal ustunlari cheksiz text). */
const NAME_MAX = 150;

class SuperAdminExistsError extends Error {}

const NAME_LABELS = {
  fName: 'Familiya',
  name: 'Ism',
  sName: 'Otasining ismi',
} as const;

type NameField = keyof typeof NAME_LABELS;

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > NAME_MAX) return null;
  // Boshqaruv belgilari va HTML teglari saqlanmaydi
  if (/[\u0000-\u001f\u007f<>]/.test(cleaned)) return null;
  return cleaned;
}

/** Ixtiyoriy qo‘shimcha himoya: `.env` da SUPERADMIN_SETUP_IPS berilgan bo‘lsa, faqat shu IP lar. */
function isSetupIpAllowed(ip: string): boolean {
  const raw = process.env.SUPERADMIN_SETUP_IPS?.trim();
  if (!raw) return true;
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .includes(ip);
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const limit = consumeRateLimit(
    'superadmin-register-ip',
    clientIp,
    ATTEMPTS_PER_IP,
    15 * 60 * 1000
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json(
        { message: 'So‘rov tanasi noto‘g‘ri' },
        { status: 400 }
      );
    }

    if (!isSetupIpAllowed(clientIp)) {
      void logSecurityEvent({
        type: 'suspicious',
        ip: clientIp,
        path: PATH,
        method: 'POST',
        message: 'SuperAdmin ro‘yxatdan o‘tish ruxsat etilmagan IP dan',
        statusCode: 403,
      });
      return NextResponse.json(
        {
          message:
            'SuperAdmin ro‘yxatdan o‘tish bu manzil uchun ruxsat etilmagan',
          code: 'SETUP_IP_DENIED',
        },
        { status: 403 }
      );
    }

    // Tizimda faqat bitta SuperAdmin bo‘ladi
    if ((await countSuperAdmins()) > 0) {
      return NextResponse.json(
        {
          message: 'SuperAdmin allaqachon yaratilgan. Tizimga kirish sahifasidan foydalaning.',
          code: 'SUPERADMIN_EXISTS',
        },
        { status: 409 }
      );
    }

    const rawNames: Record<NameField, unknown> = {
      fName: body.fName,
      name: body.name,
      sName: body.sName,
    };
    const names = {} as Record<NameField, string>;
    for (const field of Object.keys(NAME_LABELS) as NameField[]) {
      const cleaned = cleanName(rawNames[field]);
      if (!cleaned) {
        return NextResponse.json(
          {
            message: `${NAME_LABELS[field]} to‘ldirilmagan yoki noto‘g‘ri (1-${NAME_MAX} belgi)`,
          },
          { status: 400 }
        );
      }
      names[field] = cleaned;
    }

    const rawLogin = typeof body.login === 'string' ? body.login : '';
    const rawPassword = typeof body.password === 'string' ? body.password : '';
    if (!rawLogin || !rawPassword) {
      return NextResponse.json(
        { message: 'Login va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    // Login bilan bir xil normalizatsiya qoidasi (loginFlow bilan mos)
    const cleanLogin = validator.trim(rawLogin).toLowerCase();
    const cleanPassword = validator.trim(rawPassword);

    if (!validator.isLength(cleanLogin, { min: 3, max: 50 })) {
      return NextResponse.json(
        { message: 'Login 3-50 belgi oralig‘ida bo‘lishi kerak' },
        { status: 400 }
      );
    }
    if (!validator.isAlphanumeric(cleanLogin, 'en-US', { ignore: '_-' })) {
      return NextResponse.json(
        { message: 'Login faqat harf, raqam, _ va - bo‘lsin' },
        { status: 400 }
      );
    }
    const passwordError = validateNewPassword(cleanPassword);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    const existingAuth = await prisma.auth.findUnique({
      where: { login: cleanLogin },
      select: { id: true },
    });
    if (existingAuth) {
      return NextResponse.json(
        { message: 'Bu login band', code: 'LOGIN_TAKEN' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(cleanPassword);
    const userId = createDbId();
    const roleId = createDbId();
    const personalId = createDbId();
    const authId = createDbId();
    const jobId = createDbId();

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${SUPERADMIN_LOCK_KEY}::bigint)) AS advisory_lock`;
        const existingCount = await tx.job.count({
          where: { role: { role: 'superAdmin' } },
        });
        if (existingCount > 0) throw new SuperAdminExistsError();

        await tx.role.create({
          data: {
            id: roleId,
            role: 'superAdmin',
            province: '',
            permissions: getPermissionsForRole('superAdmin'),
          },
        });

        await tx.user.create({ data: { id: userId } });

        await tx.personal.create({
          data: {
            id: personalId,
            userId,
            name: names.name,
            fName: names.fName,
            sName: names.sName,
            province: '',
          },
        });

        await tx.auth.create({
          data: {
            id: authId,
            userId,
            login: cleanLogin,
            password: hashedPassword,
          },
        });

        await tx.job.create({
          data: {
            id: jobId,
            userId,
            roleId,
            position: 'SuperAdmin',
            organ: '',
            department: '',
            militaryRank: '',
            isUserTrue: true,
          },
        });
      });
    } catch (error) {
      if (error instanceof SuperAdminExistsError) {
        return NextResponse.json(
          {
            message:
              'SuperAdmin allaqachon yaratilgan. Tizimga kirish sahifasidan foydalaning.',
            code: 'SUPERADMIN_EXISTS',
          },
          { status: 409 }
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return NextResponse.json(
          { message: 'Bu login band', code: 'LOGIN_TAKEN' },
          { status: 409 }
        );
      }
      throw error;
    }

    void logSecurityEvent({
      type: 'login_success',
      ip: clientIp,
      path: PATH,
      method: 'POST',
      loginHint: cleanLogin,
      message: 'SuperAdmin hisobi yaratildi',
      statusCode: 201,
    });

    // Ro‘yxatdan o‘tgach darhol tizimga kiradi
    try {
      const sessionId = await createUserSession(
        userId,
        SESSION_SECONDS * 1000
      );
      const token = signSuperAdminToken(userId, sessionId);
      const response = NextResponse.json(
        {
          message: 'SuperAdmin yaratildi. Panelga yo‘naltirilmoqda...',
          userId,
          role: 'superAdmin',
          autoLogin: true,
        },
        { status: 201 }
      );
      return setAuthCookies(response, { superadmin: token }, SESSION_SECONDS);
    } catch (sessionError) {
      console.error('SuperAdmin sessiyasini yaratishda xato:', sessionError);
      return NextResponse.json(
        {
          message:
            'SuperAdmin yaratildi. Endi kirish sahifasi orqali tizimga kiring.',
          userId,
          role: 'superAdmin',
          autoLogin: false,
        },
        { status: 201 }
      );
    }
  } catch (error: unknown) {
    console.error('SuperAdmin ro‘yxatdan o‘tish xatosi:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

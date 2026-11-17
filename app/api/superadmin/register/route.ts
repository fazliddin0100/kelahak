import {
  countSuperAdmins,
  isValidBootstrapKey,
} from '@/lib/superadminAuth';
import { getClientIp } from '@/lib/clientIp';
import { createDbId } from '@/lib/db/document';
import { hashPassword, validateNewPassword } from '@/lib/passwordPolicy';
import { consumeRateLimit } from '@/lib/rateLimit';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { getPermissionsForRole } from '@/helpers/PermissionsForRole';
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import validator from 'validator';

const ATTEMPTS_PER_IP = process.env.NODE_ENV === 'development' ? 100 : 5;

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
    await connectToDatabase();
    const body = await request.json();
    const {
      fName,
      name,
      sName,
      province,
      organ,
      department,
      position,
      militaryRank,
      login,
      password,
      bootstrapKey = '',
      mac,
      hostname,
      note,
    } = body;

    if (
      !fName ||
      !name ||
      !sName ||
      !province ||
      !organ ||
      !department ||
      !position ||
      !militaryRank ||
      !login ||
      !password
    ) {
      return NextResponse.json(
        { message: 'Barcha majburiy maydonlar to‘ldirilmagan' },
        { status: 400 }
      );
    }

    const existingCount = await countSuperAdmins();
    if (existingCount > 0 && !isValidBootstrapKey(String(bootstrapKey))) {
      return NextResponse.json(
        {
          message:
            'SuperAdmin yaratish uchun maxfiy kalit (bootstrap key) noto‘g‘ri yoki yo‘q',
          code: 'INVALID_BOOTSTRAP_KEY',
        },
        { status: 403 }
      );
    }

    if (existingCount === 0 && !isValidBootstrapKey(String(bootstrapKey))) {
      return NextResponse.json(
        {
          message:
            'Birinchi SuperAdmin uchun .env da SUPERADMIN_BOOTSTRAP_KEY (kamida 16 belgi) o‘rnating va formada kiriting',
          code: 'BOOTSTRAP_KEY_REQUIRED',
        },
        { status: 400 }
      );
    }

    const cleanLogin = validator.trim(String(login)).toLowerCase();
    const cleanPassword = validator.trim(String(password));

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
    });
    if (existingAuth) {
      return NextResponse.json(
        { message: 'Bu login band' },
        { status: 409 }
      );
    }

    const cleanProvince = validator.trim(province);
    const hashedPassword = await hashPassword(cleanPassword);
    const userId = createDbId();
    const roleId = createDbId();
    const personalId = createDbId();
    const authId = createDbId();
    const jobId = createDbId();

    const deviceMac = mac || '00:00:00:00:00:00';
    const deviceIp = clientIp;
    const deviceHostname = hostname || os.hostname();
    const deviceNote = note || 'SuperAdmin ro‘yxatdan o‘tish';

    await prisma.$transaction(async (tx) => {
      await tx.role.create({
        data: {
          id: roleId,
          role: 'superAdmin',
          province: cleanProvince,
          permissions: getPermissionsForRole('superAdmin'),
        },
      });

      await tx.user.create({ data: { id: userId } });

      await tx.personal.create({
        data: {
          id: personalId,
          userId,
          name: validator.trim(name),
          fName: validator.trim(fName),
          sName: validator.trim(sName),
          province: cleanProvince,
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
          position: validator.trim(position),
          organ: validator.trim(organ),
          department: validator.trim(department),
          militaryRank: validator.trim(militaryRank),
          isUserTrue: true,
        },
      });

      try {
        const deviceId = createDbId();
        await tx.device.create({
          data: {
            id: deviceId,
            mac: deviceMac,
            ip: deviceIp,
            hostname: deviceHostname,
            note: deviceNote,
            lastSeen: new Date(),
          },
        });
        await tx.userDevice.create({
          data: { userId, deviceId },
        });
      } catch {
        /* optional */
      }
    });

    return NextResponse.json(
      {
        message:
          'SuperAdmin muvaffaqiyatli yaratildi. Endi tizimga kirishingiz mumkin.',
        userId,
        role: 'superAdmin',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('SuperAdmin ro‘yxatdan o‘tish xatosi:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

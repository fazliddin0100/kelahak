// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import validator from 'validator';
import type { DbRole } from '@prisma/client';

import { getClientIp } from '@/lib/clientIp';
import { commanderExistsInUnit } from '@/lib/commanderSlot';
import { createDbId } from '@/lib/db/document';
import { authLoginExists } from '@/lib/db/user';
import { hashPassword, validateNewPassword } from '@/lib/passwordPolicy';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { consumeRateLimit } from '@/lib/rateLimit';
import { provinces } from '@/lib/registrationConstants';
import { normalizeRoleForDb } from '@/lib/roles';
import { detectRole } from '../../../../helpers/detectRole';
import { getPermissionsForRole } from '../../../../helpers/PermissionsForRole';

const REGISTRATIONS_PER_IP_PER_HOUR =
  process.env.NODE_ENV === 'development' ? 200 : 10;
const MAX_FIELD_LENGTH = 150;

interface UserRequest {
  fName: string;
  name: string;
  sName: string;
  province: string;
  shahobchaId: string;
  department: string;
  position: string;
  militaryRank: string;
  login: string;
  password: string;

  // Device (ixtiyoriy)
  mac?: string;
  hostname?: string;
  note?: string;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? validator.trim(value) : '';
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);
    const limit = consumeRateLimit(
      'register-ip',
      clientIp,
      REGISTRATIONS_PER_IP_PER_HOUR,
      60 * 60 * 1000
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

    await connectToDatabase();

    const body = (await request.json()) as Partial<UserRequest>;

    const fName = cleanText(body.fName);
    const name = cleanText(body.name);
    const sName = cleanText(body.sName);
    const cleanProvince = cleanText(body.province);
    const shahobchaId = cleanText(body.shahobchaId);
    const cleanPosition = cleanText(body.position);
    const cleanDepartment = cleanText(body.department);
    const cleanMilitaryRank = cleanText(body.militaryRank);
    const cleanLogin = cleanText(body.login).toLowerCase();
    const cleanPassword = cleanText(body.password);

    // Majburiy maydonlar
    const textFields = [
      fName,
      name,
      sName,
      cleanProvince,
      shahobchaId,
      cleanPosition,
      cleanDepartment,
      cleanMilitaryRank,
    ];
    if (textFields.some((value) => !value) || !cleanLogin || !cleanPassword) {
      return NextResponse.json(
        { message: 'Barcha maydonlar to‘ldirilishi shart!' },
        { status: 400 }
      );
    }
    if (textFields.some((value) => value.length > MAX_FIELD_LENGTH)) {
      return NextResponse.json(
        { message: `Maydon uzunligi ${MAX_FIELD_LENGTH} belgidan oshmasin` },
        { status: 400 }
      );
    }
    if (!(provinces as readonly string[]).includes(cleanProvince)) {
      return NextResponse.json(
        { message: 'Viloyat ro‘yxatdan tanlanishi kerak' },
        { status: 400 }
      );
    }

    // Shahobcha shu viloyatga tegishli bo'lishi kerak
    const shahobcha = await prisma.shahobcha.findFirst({
      where: { id: shahobchaId, province: cleanProvince },
      select: { id: true, name: true },
    });
    if (!shahobcha) {
      return NextResponse.json(
        { message: 'Shahobcha ro‘yxatdan tanlanishi kerak' },
        { status: 400 }
      );
    }
    const organ = shahobcha.name;

    // Validatsiya
    if (!validator.isLength(cleanLogin, { min: 3, max: 50 })) {
      return NextResponse.json(
        { message: 'Login 3-50 belgidan iborat bo‘lsin' },
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

    // Login unique
    if (await authLoginExists(cleanLogin)) {
      return NextResponse.json(
        { message: 'Bu foydalanuvchi tizimda mavjud' },
        { status: 409 }
      );
    }

    // ROLE ANIQLASH — lavozim, bo‘lim va unvon bo‘yicha
    const detectedRole = detectRole(
      cleanPosition,
      cleanDepartment,
      cleanMilitaryRank
    );
    // Shahobcha admini (kotibiyat) faqat SuperAdmin tomonidan yaratiladi —
    // o'zi ro'yxatdan o'tgan foydalanuvchi admin bo'la olmaydi.
    const normalizedRole = normalizeRoleForDb(detectedRole);
    const autoRole = normalizedRole === 'admin' || normalizedRole === 'superAdmin' ? 'user' : normalizedRole;
    /**
     * Rol foydalanuvchi o‘zi yozgan lavozimdan taxmin qilinadi, shuning uchun
     * hech bir akkaunt o‘zini o‘zi faollashtira olmaydi: admin (kotibiyat)
     * rolini superAdmin, qolganlarini viloyat admini tasdiqlaydi.
     */
    const isUserTrue = false;

    // Bir viloyat + bo‘limda faqat bitta `commander`
    if (autoRole === 'commander') {
      const taken = await commanderExistsInUnit(cleanProvince, cleanDepartment);
      if (taken) {
        return NextResponse.json(
          {
            message: `«${cleanProvince}» viloyati, «${cleanDepartment}» bo‘limida komandir allaqachon mavjud. Boshqa lavozim bilan ro‘yxatdan o‘ting yoki admin bilan bog‘laning.`,
            code: 'COMMANDER_SLOT_TAKEN',
          },
          { status: 409 }
        );
      }
    }

    const permissions = getPermissionsForRole(autoRole);
    const hashedPassword = await hashPassword(cleanPassword);

    const userId = createDbId();
    const roleId = createDbId();
    const personalId = createDbId();
    const authId = createDbId();
    const jobId = createDbId();

    await prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { id: userId } });

      await tx.role.create({
        data: {
          id: roleId,
          role: autoRole as DbRole,
          province: cleanProvince,
          permissions,
        },
      });

      await tx.personal.create({
        data: {
          id: personalId,
          userId,
          name,
          fName,
          sName,
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
          position: cleanPosition,
          organ,
          department: cleanDepartment,
          militaryRank: cleanMilitaryRank,
          isUserTrue,
          shahobchaId: shahobcha.id,
        },
      });
    });

    // DEVICE yaratish (ixtiyoriy)
    let deviceId: string | null = null;
    try {
      const deviceDbId = createDbId();

      await prisma.device.create({
        data: {
          id: deviceDbId,
          mac: cleanText(body.mac).slice(0, 64) || '00:00:00:00:00:00',
          ip: clientIp,
          hostname: cleanText(body.hostname).slice(0, 255) || os.hostname(),
          note:
            cleanText(body.note).slice(0, 500) ||
            'Foydalanuvchi birinchi ro‘yxatdan o‘tgan qurilma',
          lastSeen: new Date(),
        },
      });

      await prisma.userDevice.create({
        data: {
          userId,
          deviceId: deviceDbId,
        },
      });

      await prisma.device.update({
        where: { id: deviceDbId },
        data: { note: `Foydalanuvchi bilan bog‘landi: ${userId}` },
      });

      deviceId = deviceDbId;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Device yaratishda xato:', message);
    }

    return NextResponse.json(
      {
        message:
          'Muvaffaqiyatli ro‘yxatdan o‘tildi! Tizimga kirish uchun ruxsat berilguncha kuting.',
        userId,
        role: autoRole,
        detectedRole,
        isUserTrue,
        deviceId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration xatosi:', error);
    return NextResponse.json(
      { message: 'Ro‘yxatdan o‘tishda server xatosi' },
      { status: 500 }
    );
  }
}

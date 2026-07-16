// app/api/register/route.ts
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import validator from 'validator';
import type { DbRole } from '@prisma/client';

import { commanderExistsInUnit } from '@/lib/commanderSlot';
import { createDbId } from '@/lib/db/document';
import { authLoginExists } from '@/lib/db/user';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { normalizeRoleForDb } from '@/lib/roles';
import { roleBypassesApproval } from '@/lib/userAccess';
import { detectRole } from '../../../../helpers/detectRole';
import { getPermissionsForRole } from '../../../../helpers/PermissionsForRole';

interface UserRequest {
  fName: string;
  name: string;
  sName: string;
  province: string;
  organ: string;
  department: string;
  position: string;
  militaryRank: string;
  login: string;
  password: string;

  // Device (ixtiyoriy)
  mac?: string;
  ip?: string;
  hostname?: string;
  note?: string;
}

export async function POST(request: NextRequest) {
  await connectToDatabase();

  try {
    const body = (await request.json()) as Partial<UserRequest>;

    const {
      fName,
      name,
      sName,
      province,
      organ,
      position = '',
      department = '',
      militaryRank,
      login,
      password,
      mac,
      ip,
      hostname,
      note,
    } = body;

    // Majburiy maydonlar
    if (
      !fName ||
      !name ||
      !sName ||
      !province ||
      !organ ||
      !position ||
      !department ||
      !militaryRank ||
      !login ||
      !password
    ) {
      return NextResponse.json(
        { message: 'Barcha maydonlar to‘ldirilishi shart!' },
        { status: 400 }
      );
    }

    // Sanitizatsiya
    const cleanLogin = validator.trim(validator.escape(login)).toLowerCase();
    const cleanPassword = validator.trim(password);

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
    if (!validator.isLength(cleanPassword, { min: 6 })) {
      return NextResponse.json(
        { message: 'Parol kamida 6 belgidan iborat bo‘lsin' },
        { status: 400 }
      );
    }

    // Login unique
    if (await authLoginExists(cleanLogin)) {
      return NextResponse.json(
        { message: 'Bu foydalanuvchi tizimda mavjud' },
        { status: 409 }
      );
    }

    // ROLE ANIQLASH — lavozim, bo‘lim va unvon bo‘yicha
    const cleanProvince = validator.trim(province);
    const cleanDepartment = validator.trim(department);
    const cleanPosition = validator.trim(position);
    const cleanMilitaryRank = validator.trim(militaryRank);

    const detectedRole = detectRole(
      cleanPosition,
      cleanDepartment,
      cleanMilitaryRank
    );
    const autoRole = normalizeRoleForDb(detectedRole);
    /** Kotibiyat (admin) va superAdmin darhol kiradi; user/komandir kutadi */
    const isUserTrue = roleBypassesApproval(autoRole);

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
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

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
          position: cleanPosition,
          organ: validator.trim(organ),
          department: cleanDepartment,
          militaryRank: cleanMilitaryRank,
          isUserTrue,
        },
      });
    });

    // DEVICE yaratish (ixtiyoriy)
    let deviceId: string | null = null;
    try {
      const deviceDbId = createDbId();
      const deviceIp =
        ip ||
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1';

      await prisma.device.create({
        data: {
          id: deviceDbId,
          mac: mac || '00:00:00:00:00:00',
          ip: deviceIp,
          hostname: hostname || os.hostname(),
          note: note || 'Foydalanuvchi birinchi ro‘yxatdan o‘tgan qurilma',
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

    const successMessage =
      autoRole === 'superAdmin' ?
        'Muvaffaqiyatli ro‘yxatdan o‘tildi! SuperAdmin sifatida darhol tizimga kira olasiz.'
      : 'Muvaffaqiyatli ro‘yxatdan o‘tildi! Tizimga kirish uchun ruxsat berilguncha kuting.';

    return NextResponse.json(
      {
        message: successMessage,
        userId,
        role: autoRole,
        detectedRole,
        isUserTrue,
        deviceId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server xatosi';
    console.error('Registration xatosi:', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}

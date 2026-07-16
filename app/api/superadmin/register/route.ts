import bcrypt from 'bcryptjs';
import {
  countSuperAdmins,
  isValidBootstrapKey,
} from '@/lib/superadminAuth';
import { createDbId } from '@/lib/db/document';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { getPermissionsForRole } from '@/helpers/PermissionsForRole';
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import validator from 'validator';

export async function POST(request: NextRequest) {
  await connectToDatabase();

  try {
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
      ip,
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
            'Birinchi SuperAdmin uchun .env da SUPERADMIN_BOOTSTRAP_KEY o‘rnating va formada kiriting',
          code: 'BOOTSTRAP_KEY_REQUIRED',
        },
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
    if (!validator.isLength(cleanPassword, { min: 8 })) {
      return NextResponse.json(
        { message: 'Parol kamida 8 belgidan iborat bo‘lishi kerak' },
        { status: 400 }
      );
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
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const userId = createDbId();
    const roleId = createDbId();
    const personalId = createDbId();
    const authId = createDbId();
    const jobId = createDbId();

    const deviceMac = mac || '00:00:00:00:00:00';
    const deviceIp =
      ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';
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
    const message = error instanceof Error ? error.message : 'Server xatosi';
    return NextResponse.json({ message }, { status: 500 });
  }
}

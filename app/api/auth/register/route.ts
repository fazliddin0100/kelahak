// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import validator from 'validator';
import type { DbRole } from '@prisma/client';

import { getClientIp } from '@/lib/clientIp';
import { commanderExistsInUnit } from '@/lib/commanderSlot';
import { createDbId } from '@/lib/db/document';
import { normalizeMac } from '@/lib/eimzo/mac';
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

  // Ro'yxatdan o'tayotgan kompyuter (Mezon agentining /v1/info javobidan)
  device?: unknown;
}

/** Agent ma'lumoti: MAC lar tekshiriladi, qolgani uzunligi cheklanadi. Yaroqsiz bo'lsa null. */
function parseRegistrationDevice(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const list = Array.isArray(r.macs) ? r.macs : [];
  const macs = [
    ...new Set(
      list
        .slice(0, 16)
        .map((m) => normalizeMac(typeof m === 'string' ? m : (m as { mac?: unknown })?.mac))
        .filter((m): m is string => !!m)
    ),
  ].sort();
  if (macs.length === 0) return null;
  const primary = normalizeMac(r.mac);
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const keyHash = text(r.publicKeySha256, 64);
  return {
    mac: primary && macs.includes(primary) ? primary : macs[0],
    macs: macs.join(','),
    hostname: text(r.hostname, 64),
    diskSerial: text(r.diskSerial, 128),
    diskModel: text(r.diskModel, 120),
    agentKeySha256: /^[0-9a-f]{64}$/.test(keyHash) ? keyHash : '',
  };
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

    // DEVICE yaratish: ro'yxatdan o'tayotgan kompyuter (sahifa Mezon agentidan oladi).
    // Agent bo'lmasa ham ro'yxatdan o'tish to'xtamaydi — faqat kompyuter ma'lumoti yozilmaydi.
    let deviceId: string | null = null;
    try {
      const hw = parseRegistrationDevice(body.device);
      const deviceDbId = createDbId();
      await prisma.device.create({
        data: {
          id: deviceDbId,
          mac: hw?.mac ?? '',
          macs: hw?.macs ?? '',
          ip: clientIp,
          hostname: hw?.hostname || null,
          diskSerial: hw?.diskSerial ?? '',
          diskModel: hw?.diskModel ?? '',
          agentKeySha256: hw?.agentKeySha256 ?? '',
          source: hw ? 'agent' : 'none',
          note: hw ? 'Ro‘yxatdan o‘tgan kompyuter (Mezon agenti)' : 'Agentsiz ro‘yxatdan o‘tgan',
          lastSeen: new Date(),
          users: { create: { userId } },
        },
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

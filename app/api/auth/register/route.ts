// app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import os from 'os';

// Modellar
import Personal from '@/models/Personal';
import Auth from '@/models/Auth';
import Job from '@/models/Job';
import User from '@/models/User';
import Role from '@/models/Role';
import Device from '@/models/Device';

// Helper funksiyalar
import { getPermissionsForRole } from '@/helpers/PermissionsForRole';
import connectToDatabase from '@/lib/mongodb';
import { detectRole } from '@/helpers/detectRole';

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
    const existingAuth = await Auth.findOne({ login: cleanLogin });
    if (existingAuth) {
      return NextResponse.json({ message: 'Bu login band' }, { status: 409 });
    }

    // ROLE ANIQLASH – ENG MUHIM QISM!
    // position va departmentni birlashtirib qidirdik → hech qachon o‘tib ketmaydi
    const searchText = `${position} ${department}`.trim();
    const autoRole = detectRole(searchText);

    // Debug log (keyin o‘chirib qo‘yishingiz mumkin)
    console.log('Rol aniqlash uchun matn:', searchText);
    console.log('Aniqlangan rol:', autoRole);

    // Role yaratish
    const permissions = getPermissionsForRole(autoRole);
    const role = await Role.create({
      role: autoRole,
      province: validator.trim(province),
      permissions,
    });

    // Parolni hash qilish
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // Personal ma'lumotlari
    const personal = await Personal.create({
      name: validator.trim(name),
      fName: validator.trim(fName),
      sName: validator.trim(sName),
      province: validator.trim(province),
    });

    // Auth (login/parol)
    const auth = await Auth.create({
      login: cleanLogin,
      password: hashedPassword,
    });

    // Job (lavozim, bo‘lim va h.k.)
    const job = await Job.create({
      position: validator.trim(position),
      organ: validator.trim(organ),
      department: validator.trim(department),
      militaryRank: validator.trim(militaryRank),
      role: role._id,
      isUserTrue: false,
    });

    // DEVICE yaratish (ixtiyoriy)
    let deviceId = null;
    try {
      const device = await Device.create({
        mac: mac || '00:00:00:00:00:00',
        ip:
          ip ||
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          request.headers.get('x-real-ip') ||
          '127.0.0.1',
        hostname: hostname || os.hostname(),
        note: note || 'Foydalanuvchi birinchi ro‘yxatdan o‘tgan qurilma',
        lastSeen: new Date(),
      });
      deviceId = device._id;
    } catch (e: any) {
      console.error('Device yaratishda xato:', e.message);
      // Xato bo‘lsa ham davom etamiz
    }

    // Asosiy User modelini yaratish
    const user = await User.create({
      personal: personal._id,
      auth: auth._id,
      job: job._id,
      devices: deviceId ? [deviceId] : [],
    });

    // Agar device yaratilgan bo‘lsa, unga user ID qo‘shib qo‘yamiz
    if (deviceId) {
      await Device.updateOne(
        { _id: deviceId },
        { note: `Foydalanuvchi bilan bog‘landi: ${user._id}` }
      );
    }

    return NextResponse.json(
      {
        message: 'Muvaffaqiyatli ro‘yxatdan o‘tildi!',
        userId: user._id,
        role: autoRole,
        deviceId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration xatosi:', error);
    return NextResponse.json(
      { message: error.message || 'Server xatosi' },
      { status: 500 }
    );
  }
}

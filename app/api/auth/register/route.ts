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
// Helper
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

  // Device ma’lumotlari (ixtiyoriy)
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
      position,
      department,
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

    // 3. Sanitizatsiya
    const cleanLogin = validator.trim(validator.escape(login)).toLowerCase();
    const cleanPassword = validator.trim(password);

    // 4. Validatsiya
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

    // 5. Login unique
    const existingAuth = await Auth.findOne({ login: cleanLogin });
    if (existingAuth) {
      return NextResponse.json({ message: 'Bu login band' }, { status: 409 });
    }

    //6. Role aniqlash
    const autoRole = detectRole(department);
    console.log('Aniqlangan role:', autoRole);
    // 7. Role yaratish
    const permissions = getPermissionsForRole(autoRole);
    const role = await Role.create({
      role: autoRole,
      province,
      permissions,
    });

    // Parolni hash qilish
    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // 8. Alohida modellar
    const personal = await Personal.create({
      name: validator.trim(name),
      fName: validator.trim(fName),
      sName: validator.trim(sName),
      province: validator.trim(province),
    });

    const auth = await Auth.create({
      login: cleanLogin,
      password: hashedPassword,
    });

    const job = await Job.create({
      position: validator.trim(position),
      organ: validator.trim(organ),
      department: validator.trim(department),
      militaryRank: validator.trim(militaryRank),
      role: role._id,
      isUserTrue: false,
    });

    // ✅ DEVICE YARATILDI (ixtiyoriy)
    let deviceId = null;

    try {
      const device = await Device.create({
        mac: mac || '00:00:00:00:00:00', // dummy MAC (keyin o‘zgartirilishi mumkin)
        ip:
          ip ||
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          '127.0.0.1',
        hostname: hostname || os.hostname(), // ✅ Node.js server hostname
        note: note || 'User first registration device',
        lastSeen: new Date(),
      });

      deviceId = device._id;
    } catch (e: any) {
      console.error('Device yaratishda xato:', e.message);
      // agar device xato bo‘lsa ham user ro‘yxatdan o‘tadi
    }

    // ✅ 9. User — bog‘lovchi model
    const user = await User.create({
      personal: personal._id,
      auth: auth._id,
      job: job._id,
      devices: deviceId ? [deviceId] : [],
    });

    // ✅ Device bo‘lsa userga bog‘lab qo‘ydik
    if (deviceId) {
      await Device.updateOne(
        { _id: deviceId },
        { note: `Attached to user ${user._id}` }
      );
    }

    return NextResponse.json(
      {
        message: 'Muvaffaqiyatli ro‘yxatdan o‘tildi!',
        userId: user._id,
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

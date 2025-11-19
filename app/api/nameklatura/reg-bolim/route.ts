import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import Job from '@/models/Job';
import { getUserId } from '@/lib/userid';
import { BolimModel } from '@/models/bolim';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { bolim } = await request.json();

    // 1. Validate
    if (!bolim) {
      return NextResponse.json(
        { message: "Bolim maydonlari to'ldirilishi kerak" },
        { status: 400 }
      );
    }

    // 2. Current userni olish
    const userId = getUserId(request);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // 3. Personal check
    const personal = await Personal.findById(user.personal);
    if (!personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    // 4. Role check
    const job = await Job.findById(user.job);
    if (!job) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    // 6. Create new bolim
    const newBolim = new BolimModel({ province: personal.province, bolim });
    await newBolim.save();

    return NextResponse.json(
      { message: "Bo'lim muvaffaqiyatli yaratildi", bolim: newBolim },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bo'lim yaratishda xato:", error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: error.message },
      { status: 500 }
    );
  }
}

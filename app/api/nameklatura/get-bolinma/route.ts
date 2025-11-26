// app/api/nameklatura/get-bolinma/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';
import { BolinmaModel } from '@/models/bolinma';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // 1. Current userni olish
    const userId = getUserId(request);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // 2. Personal check
    const personal = await Personal.findById(user.personal);
    if (!personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }

    // 3. Province bo‘yicha bo‘limlarni olish
    const bolinmalar = await BolinmaModel.find({ province: personal.province });

    if (!bolinmalar || bolinmalar.length === 0) {
      return NextResponse.json(
        { message: 'Bo‘lim topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Bo‘limlar muvaffaqiyatli olindi', bolinmalar },
      { status: 200 }
    );
  } catch (error: any) {
    // console.error('Bo‘limlarni olishda xato:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: error.message },
      { status: 500 }
    );
  }
}

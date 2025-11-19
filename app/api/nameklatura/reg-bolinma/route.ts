// api/nameklatura/reg-bolinma

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { BolinmaModel } from '@/models/bolinma';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { bolinma } = body;

    // 1. Validate
    if (!bolinma) {
      return NextResponse.json(
        { message: "Bo'linma field is required" },
        { status: 400 }
      );
    }

    // 2. Current userni olish
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID not found' },
        { status: 403 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 3. Personal check
    const personal = await Personal.findById(user.personal);
    if (!personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }
    // 5. Create new bolinma
    const newBolinma = new BolinmaModel({
      province: personal.province || 'Unknown',
      bolinma,
    });
    await newBolinma.save();

    return NextResponse.json(
      {
        message: "Bo'linma muvaffaqiyatli yaratildi",
        bolinma: newBolinma,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Xatolik:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: error.message },
      { status: 500 }
    );
  }
}

// app/api/nameklatura/get-nomeklatura/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';
import { NomeklaturaModel } from '@/models/nomeklatura';
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

    // 3. Barcha bo‘linmalarni olish
    const bolinmalar = await BolinmaModel.find();
    if (!bolinmalar || bolinmalar.length === 0) {
      return NextResponse.json(
        { message: 'Bo‘linma topilmadi' },
        { status: 404 }
      );
    }

    // 4. Har bir bo‘linmaga tegishli nomeklaturalarni topish
    const results = await Promise.all(
      bolinmalar.map(async (bolinma) => {
        const nomeklaturalar = await NomeklaturaModel.find({
          bolinma: bolinma._id,
        }).select(
          'registrationIndex title grif status author status saqlashMuddati qonunTuri owner createdAt'
        );

        return {
          _id: bolinma._id,
          bolinma: bolinma.bolinma, // bo‘linma nomi
          nomeklaturalar,
        };
      })
    );

    return NextResponse.json(
      { message: 'Bo‘linmalar muvaffaqiyatli olindi', results },
      { status: 200 }
    );
  } catch (error: any) {
    // console.error('Bo‘linmalarni olishda xato:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: error.message },
      { status: 500 }
    );
  }
}

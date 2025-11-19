// app/api/nameklatura/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';
import Job from '@/models/Job';
import { BolimModel } from '@/models/bolim';

// create bolim
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { bolim } = await request.json();
    if (!bolim) {
      return NextResponse.json(
        { message: "Barcha maydonlar to'ldirilishi kerak" },
        { status: 400 }
      );
    }
    // user
    const userId = getUserId(request);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }
    // province
    const personal = await Personal.findById(user.personal);
    if (!personal) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }
    // role
    const job = await Job.findById(user.job);
    if (!job) {
      return NextResponse.json(
        { message: "Foydalanuvchining ma'lumoti topilmadi" },
        { status: 400 }
      );
    }
    // find bolim
    const findBolim = await BolimModel.findOne({ bolim: bolim });
    if (findBolim) {
      return NextResponse.json({ message: "Bo'lim mavjud" }, { status: 404 });
    }
    // create bolinma
    const newBolinma = new BolimModel({ bolim: bolim });
    await newBolinma.save();

    return NextResponse.json("Bo'lim yaratildi", { status: 201 });
  } catch (error: any) {
    console.error('Hujjat yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Hujjat yaratishda xatolik', error: error.message },
      { status: 500 }
    );
  }
}

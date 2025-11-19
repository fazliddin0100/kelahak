// app/api/nameklatura/reg-nomeklatura/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { NomeklaturaModel, NomeklaturaStatus } from '@/models/nomeklatura';
import { BolinmaModel } from '@/models/bolinma';
import { BolimModel } from '@/models/bolim';
import User from '@/models/User';
import { getUserId } from '@/lib/userid';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      registrationIndex,
      title,
      grif,
      saqlashMuddati,
      qonunTuri,
      bolinma,
      bolim,
      author,
    } = body;

    // 🔑 Current userni olish
    const userId = getUserId(request);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // ✅ Bo‘linma tekshirish
    const existingBolinma = await BolinmaModel.findById(bolinma[0] || bolinma);
    if (!existingBolinma) {
      return NextResponse.json(
        { message: 'Bo‘linma topilmadi' },
        { status: 404 }
      );
    }

    // ✅ Bo‘lim tekshirish
    const existingBolim = await BolimModel.findById(bolim[0] || bolim);
    if (!existingBolim) {
      return NextResponse.json(
        { message: 'Bo‘lim topilmadi' },
        { status: 404 }
      );
    }

    // ✅ Nomeklatura yaratish
    const newNomeklatura = new NomeklaturaModel({
      registrationIndex,
      title,
      grif,
      saqlashMuddati,
      qonunTuri,
      bolinma: [existingBolinma._id],
      bolim: [existingBolim._id],
      owner: user._id,
      author: {
        userId: author.userId,
        fullName: author.fullName,
        militaryRank: author.militaryRank,
        position: author.position,
        department: author.department,
        province: author.province,
      },
      status: NomeklaturaStatus.CREATED,
    });

    await newNomeklatura.save();

    return NextResponse.json(
      {
        message: 'Nomeklatura muvaffaqiyatli yaratildi',
        nomeklatura: newNomeklatura,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Nomeklatura yaratishda xato:', error);
    return NextResponse.json(
      { message: 'Serverda xatolik', error: error.message || error.toString() },
      { status: 500 }
    );
  }
}

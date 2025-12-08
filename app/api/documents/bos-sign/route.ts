// app/api/documents/bos-sign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';
import { DocumentModel } from '@/models/DocumentModal';
import mongoose from 'mongoose';
import { PersonalDocument } from '@/types/document';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json(
        { message: 'Foydalanuvchi aniqlanmadi' },
        { status: 401 }
      );
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userObjId).lean();
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // FIX: Tipni qo‘lda aniqlaymiz
    const personal = (await Personal.findById(
      user.personal
    ).lean()) as PersonalDocument | null;

    if (!personal || !personal.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchining viloyati topilmadi' },
        { status: 400 }
      );
    }

    const userProvince = personal.province;

    const documents = await DocumentModel.find({
      ownerRegion: userProvince,
      //
      $or: [{ 'bosSigned.hasSigned': false }],
    }).lean();

    return NextResponse.json({ documents: documents }, { status: 200 });
  } catch (error) {
    console.error('Hujjatlarni olishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

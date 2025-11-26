// app/api/documents/signet-documents/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Personal from '@/models/Personal';
import { getUserId } from '@/lib/userid';
import { DocumentModel } from '@/models/DocumentModal';
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

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const personal = await Personal.findById(
      user.personal
    ).lean<PersonalDocument>();
    if (!personal || !personal.province) {
      return NextResponse.json(
        { message: 'Foydalanuvchining viloyati topilmadi' },
        { status: 400 }
      );
    }

    const userProvince = personal.province;

    // Viloyat bo‘yicha filterlash
    const documents = await DocumentModel.find({
      ownerRegion: userProvince,
      // User hali imzo qo‘ymagan hujjatlar
      'author.userId': user._id,
      'author.hasSigned': false,
    })
      .populate('owner', 'fullName militaryRank position')
      .populate('author.userId', 'fullName militaryRank position')
      .lean();

    return NextResponse.json(
      {
        documents,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hujjatlarni olishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

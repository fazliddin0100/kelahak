// app/api/documents/route.ts
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

    // Foydalanuvchini topish
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // Foydalanuvchining Personal ma'lumotlaridan viloyatni olish
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

    // URL parametrlarni olish
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get('limit') || '10', 10))
    );
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    // MUHIM: Avval viloyat bo‘yicha filterlash
    const query = { ownerRegion: userProvince };

    const documents = await DocumentModel.find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'fullName militaryRank position')
      .populate('author.userId', 'fullName militaryRank position')
      .lean();

    const totalDocuments = await DocumentModel.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limit);

    // Userning o‘z hujjatlarini ajratib olish
    const userDocuments = documents.filter(
      (doc) => String(doc.owner?._id) === String(user._id)
    );

    return NextResponse.json(
      {
        page,
        limit,
        totalPages,
        totalDocuments,
        documents: userDocuments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hujjatlarni olishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

// app/api/documents/[id]/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getUserId } from '@/lib/userid';
import { DocumentModel } from '@/models/DocumentModal';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const currentUserId = getUserId(request);
    if (!currentUserId) {
      return NextResponse.json(
        { message: 'Foydalanuvchi aniqlanmadi' },
        { status: 401 }
      );
    }

    // params ni await qilish kerak
    const { id } = await context.params;

    const document = await DocumentModel.findById(id);
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    // body dan userId ni olish
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { message: 'userId yuborilmadi' },
        { status: 400 }
      );
    }

    // allowedUsers ga qo‘shish
    document.allowedUsers = [
      ...new Set([...(document.allowedUsers || []), userId]),
    ];

    document.sharedWithAdmin = true;
    await document.save();

    return NextResponse.json(
      { message: 'Hujjat muvaffaqiyatli yuborildi' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hujjatni ulashishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

// app/api/documents/share-admin-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { getUserId } from '@/lib/userid';
import { DocumentModel } from '@/models/DocumentModal';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const currentUserId = getUserId(request);
    if (!currentUserId) {
      return NextResponse.json(
        { message: 'Foydalanuvchi aniqlanmadi' },
        { status: 401 }
      );
    }
    // Shartga mos keladigan barcha hujjatlarni olish
    const documents = await DocumentModel.find({
      sharedWithAdmin: true,
      allowedUsers: { $in: [currentUserId] },
      status: 'registered',
    });

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { message: 'Mos hujjatlar topilmadi' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Ro‘yhatdagi hujjatlar', documents },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hujjatlarni olishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

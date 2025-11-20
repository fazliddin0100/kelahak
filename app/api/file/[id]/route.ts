// app/api/file/[id]/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import FileModel from '@/models/File';
import connectToDatabase from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ← Promise tipini belgilash muhim!
) {
  try {
    await connectToDatabase();

    // ← Bu yerda await qilish shart!
    const { id } = await params;

    if (!id || id.length !== 24) {
      return NextResponse.json({ error: 'Noto‘g‘ri ID' }, { status: 400 });
    }

    const fileDoc = await FileModel.findById(id); // ← { _id: id } emas, to‘g‘ridan id beriladi

    if (!fileDoc) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 404 });
    }

    const filePath = path.resolve(
      'public',
      fileDoc.filePath.replace(/^\/+/, '')
    ); // "/public/uploads/..." bo‘lsa tozalaymiz
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          path.basename(filePath)
        )}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Server xatosi: ' + error.message },
      { status: 500 }
    );
  }
}

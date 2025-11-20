import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import FileModel from '@/models/File';
import connectToDatabase from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const nomi = formData.get('nomi') as string;
    const raqami = formData.get('raqami') as string;
    const maxfiylik = formData.get('maxfiylik') as string;
    const sanasi = formData.get('sanasi') as string;
    const customName = formData.get('customName') as string;

    if (!file) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
    }

    // Faylni bufferga o‘tkazamiz
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Faylni saqlash joyi
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = customName || `file_${Date.now()}`;
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, buffer);

    // MongoDB ga yozamiz
    const newFile = await FileModel.create({
      nomi,
      raqami,
      maxfiylik,
      sanasi,
      filePath: `/uploads/${safeName}`,
    });

    return NextResponse.json({
      message: '✅ Fayl muvaffaqiyatli yuklandi va saqlandi',
      fileName: newFile.nomi,
      filePath: newFile.filePath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

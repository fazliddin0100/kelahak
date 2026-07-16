import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';
import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

        if (!user.personal) {
      return NextResponse.json(
        { message: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const province = user.personal.province;

    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const nomi = formData.get('nomi') as string;
    const raqami = formData.get('raqami') as string;
    const maxfiylik = formData.get('maxfiylik') as string;
    const sanasi = formData.get('sanasi') as string;
    const customName = formData.get('customName') as string;

    if (!file) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = customName || `file_${Date.now()}`;
    const diskPath = path.join(uploadDir, safeName);
    await fs.writeFile(diskPath, buffer);

    const newFile = await prisma.file.create({
      data: {
        id: createDbId(),
        nomi,
        raqami,
        maxfiylik,
        sanasi,
        ownerRegion: province,
        userUploadId: user.id,
        filePath: `/uploads/${safeName}`,
      },
    });

    return NextResponse.json({
      message: 'Fayl muvaffaqiyatli yuklandi va saqlandi',
      fileName: newFile.nomi,
      filePath: newFile.filePath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

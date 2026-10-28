import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';
import { NextRequest, NextResponse } from 'next/server';
import { stageEncryptedUpload } from '@/lib/sessionFiles';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, sessionId, user } = auth;

        if (!user.personal) {
      return NextResponse.json(
        { message: 'Personal topilmadi' },
        { status: 404 }
      );
    }

    const province = user.personal.province;

    const formData = await request.formData();
    const file = formData.get('file');
    const nomi = String(formData.get('nomi') ?? '');
    const raqami = String(formData.get('raqami') ?? '');
    const maxfiylik = String(formData.get('maxfiylik') ?? '');
    const sanasi = String(formData.get('sanasi') ?? '');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
    }
    if (!sessionId) return NextResponse.json({ error: 'Sessiya eskirgan, qayta kiring.' }, { status: 401 });
    if (file.size <= 0 || file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fayl hajmi 25 MB dan oshmasligi kerak.' }, { status: 413 });
    }
    const fileBytes = Buffer.from(await file.arrayBuffer());
    if (!fileBytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return NextResponse.json({ error: 'Faqat haqiqiy PDF fayl yuklash mumkin.' }, { status: 415 });
    }

    const fileId = createDbId();
    const storagePath = await stageEncryptedUpload(sessionId, fileBytes);
    let newFile;
    try {
      newFile = await prisma.$transaction(async (tx) => {
        const created = await tx.file.create({
          data: { id: fileId, nomi: nomi || file.name, raqami, maxfiylik, sanasi,
            ownerRegion: province, userUploadId: userId, filePath: null,
            mimeType: 'application/pdf' },
        });
        await tx.pendingUpload.create({
          data: { id: createDbId(), sessionId, userId, fileId, storagePath },
        });
        return created;
      });
    } catch (error) {
      const { unlink } = await import('node:fs/promises');
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

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

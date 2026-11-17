import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { scanBuffer } from '@/lib/antivirus';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';
import { NextRequest, NextResponse } from 'next/server';
import { stageEncryptedUpload } from '@/lib/sessionFiles';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_META_LENGTH = 300;

function metaField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim().slice(0, MAX_META_LENGTH) : '';
}

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

    const declaredLength = Number(request.headers.get('content-length'));
    if (declaredLength > MAX_FILE_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: 'Fayl hajmi 25 MB dan oshmasligi kerak.' }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const nomi = metaField(formData, 'nomi');
    const raqami = metaField(formData, 'raqami');
    const maxfiylik = metaField(formData, 'maxfiylik');
    const sanasi = metaField(formData, 'sanasi');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fayl hajmi 25 MB dan oshmasligi kerak.' }, { status: 413 });
    }
    const fileBytes = Buffer.from(await file.arrayBuffer());
    if (!fileBytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return NextResponse.json({ error: 'Faqat haqiqiy PDF fayl yuklash mumkin.' }, { status: 415 });
    }

    try {
      const scan = await scanBuffer(fileBytes);
      if (scan.status === 'infected') {
        console.warn(`Zararlangan fayl rad etildi (${scan.signature}), user=${userId}`);
        return NextResponse.json({ error: 'Faylda zararli kod aniqlandi.' }, { status: 422 });
      }
    } catch (error) {
      console.error('Antivirus tekshiruvi bajarilmadi:', error);
      return NextResponse.json({ error: 'Faylni antivirus tekshiruvidan o‘tkazib bo‘lmadi.' }, { status: 503 });
    }

    const fileId = createDbId();
    const storagePath = await stageEncryptedUpload(sessionId, fileId, fileBytes);
    let newFile;
    try {
      newFile = await prisma.$transaction(async (tx) => {
        const created = await tx.file.create({
          data: { id: fileId, nomi: nomi || file.name.slice(0, MAX_META_LENGTH), raqami, maxfiylik, sanasi,
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

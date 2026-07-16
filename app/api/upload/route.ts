// app/api/upload/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import { scanBufferWithClamAV } from '@/lib/antivirus';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req);
  if (isAuthError(auth)) return auth;

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const type = await fileTypeFromBuffer(buffer);
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowed = ['pdf', 'docx', 'jpg', 'png', 'mp4', 'zip', 'rar'];

  if (!type || !ext || !allowed.includes(ext)) {
    return NextResponse.json({ error: 'Ruxsat etilmagan fayl turi' }, { status: 400 });
  }

  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fayl hajmi 10MB dan oshmasligi kerak' }, { status: 413 });
  }

  const tempPath = path.join('/tmp', `${randomUUID()}.${ext}`);
  await writeFile(tempPath, buffer);

  try {
    const isClean = await scanBufferWithClamAV(buffer);
    if (!isClean) {
      return NextResponse.json({ error: '❌ Faylda virus topildi!' }, { status: 403 });
    }
  } catch (err) {
    console.error('Antivirus xatosi:', err);
    return NextResponse.json({ error: 'Antivirus xatosi' }, { status: 500 });
  }

  return NextResponse.json({ message: '✅ Fayl xavfsiz va qabul qilindi' }, { status: 200 });
}

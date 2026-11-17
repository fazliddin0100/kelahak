// app/api/upload/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import { fileTypeFromBuffer } from 'file-type';
import { scanBuffer } from '@/lib/antivirus';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'jpg', 'png', 'mp4', 'zip', 'rar']);

/** Faylni saqlamasdan tekshiradi: turi (kengaytma emas, tarkib bo‘yicha) va antivirus. */
export async function POST(req: NextRequest) {
  const auth = await requireApiAuth(req);
  if (isAuthError(auth)) return auth;

  if (Number(req.headers.get('content-length')) > MAX_FILE_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'Fayl hajmi 10MB dan oshmasligi kerak' }, { status: 413 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fayl topilmadi' }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Fayl hajmi 10MB dan oshmasligi kerak' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const type = await fileTypeFromBuffer(buffer);
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (!type || !ext || !ALLOWED_EXTENSIONS.has(type.ext) || type.ext !== ext) {
    return NextResponse.json({ error: 'Ruxsat etilmagan fayl turi' }, { status: 400 });
  }

  try {
    const scan = await scanBuffer(buffer);
    if (scan.status === 'infected') {
      return NextResponse.json({ error: '❌ Faylda virus topildi!' }, { status: 403 });
    }
    if (scan.status === 'skipped') {
      return NextResponse.json({ error: 'Antivirus sozlanmagan' }, { status: 503 });
    }
  } catch (err) {
    console.error('Antivirus xatosi:', err);
    return NextResponse.json({ error: 'Antivirus xatosi' }, { status: 500 });
  }

  return NextResponse.json({ message: '✅ Fayl xavfsiz va qabul qilindi' }, { status: 200 });
}

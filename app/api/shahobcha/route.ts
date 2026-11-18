import { listShahobchaNames } from '@/lib/db/shahobcha';
import { provinces } from '@/lib/registrationConstants';
import { NextRequest, NextResponse } from 'next/server';

/** Ochiq: ro'yxatdan o'tish formasi uchun viloyatdagi shahobchalar nomlari. */
export async function GET(request: NextRequest) {
  const province = request.nextUrl.searchParams.get('province')?.trim() ?? '';
  if (!(provinces as readonly string[]).includes(province)) {
    return NextResponse.json({ shahobchalar: [] });
  }
  try {
    const shahobchalar = await listShahobchaNames(province);
    return NextResponse.json({ shahobchalar });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

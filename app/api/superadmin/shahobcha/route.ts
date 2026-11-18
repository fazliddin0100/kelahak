import {
  createShahobchaWithAdmin,
  listShahobchalarForSuperAdmin,
  ShahobchaInputError,
  type CreateShahobchaInput,
} from '@/lib/db/shahobcha';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    const shahobchalar = await listShahobchalarForSuperAdmin();
    return NextResponse.json({ shahobchalar });
  } catch {
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  try {
    const body = (await request.json().catch(() => null)) as CreateShahobchaInput | null;
    if (!body) {
      return NextResponse.json({ message: 'So‘rov tanasi noto‘g‘ri' }, { status: 400 });
    }
    const created = await createShahobchaWithAdmin(body);
    return NextResponse.json(
      { message: 'Shahobcha va uning admini yaratildi', shahobcha: created },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ShahobchaInputError) {
      return NextResponse.json({ message: e.message }, { status: e.status });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ message: 'Shahobcha nomi yoki login band' }, { status: 409 });
    }
    console.error('Shahobcha yaratish xatosi:', e);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

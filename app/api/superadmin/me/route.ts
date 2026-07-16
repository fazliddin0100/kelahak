import { findUserById, serializeUser } from '@/lib/db/user';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;

  const user = await findUserById(check.userId);
  if (!user) {
    return NextResponse.json(
      { message: 'Foydalanuvchi topilmadi' },
      { status: 404 }
    );
  }

  return NextResponse.json({ user: serializeUser(user), role: 'superAdmin' });
}

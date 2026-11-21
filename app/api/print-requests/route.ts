import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { isKotibiyatStaffRole } from '@/lib/roles';
import { listRequestsForKotibiyat } from '@/lib/printRequests';

/** Kotibiyat xodimiga kelgan chop etish so'rovlari */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    if (!isKotibiyatStaffRole(auth.role)) {
      return NextResponse.json({ message: 'Ruxsat yo‘q' }, { status: 403 });
    }
    const requests = await listRequestsForKotibiyat({
      userId: auth.userId,
      province: auth.user.personal?.province,
    });
    return NextResponse.json({ requests }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Chop etish so‘rovlari ro‘yxatida xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

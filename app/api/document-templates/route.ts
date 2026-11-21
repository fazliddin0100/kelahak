import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { listUserTemplates } from '@/lib/userTemplates';

/** Joriy userning shaxsiy hujjat namunalari (galereya uchun) */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request, { permission: 'create_document' });
    if (isAuthError(auth)) return auth;

    const templates = await listUserTemplates(auth.userId);
    return NextResponse.json(
      { templates },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Namunalar ro‘yxatini olishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

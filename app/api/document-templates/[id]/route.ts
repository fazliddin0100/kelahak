import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/document';
import { deleteUserTemplate } from '@/lib/userTemplates';

/** Shaxsiy namunani o'chirish (namunadan yaratilgan hujjatlarga ta'sir qilmaydi) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request, { permission: 'create_document' });
    if (isAuthError(auth)) return auth;

    const { id } = await params;
    if (!isValidDbId(id) || !(await deleteUserTemplate(auth.userId, id))) {
      return NextResponse.json({ message: 'Namuna topilmadi' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Namuna o‘chirildi' });
  } catch (error) {
    console.error('Namunani o‘chirishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

// Hujjatdagi E-IMZO imzolari va ularning har birini qayta tekshirish natijasi.
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { documentNotFoundResponse, loadViewableDocument } from '@/lib/documentAccess';
import { isValidDbId } from '@/lib/dbId';
import { listDocumentSignatures } from '@/lib/eimzo/documentSign';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isValidDbId(id)) return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;

    const document = await loadViewableDocument(id, auth);
    if (!document) return documentNotFoundResponse();

    const signatures = await listDocumentSignatures(id);
    return NextResponse.json({ signatures });
  } catch (error) {
    console.error('Imzolar ro‘yxati xatosi:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

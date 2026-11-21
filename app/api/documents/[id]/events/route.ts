import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { documentNotFoundResponse, loadViewableDocument } from '@/lib/documentAccess';
import { isValidDbId } from '@/lib/db/document';
import { listDocumentEvents } from '@/lib/documentEvents';

/** Hujjat tarixi (jurnal) — hujjatni ko'ra oladigan har kim uchun */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    if (!isValidDbId(id)) return documentNotFoundResponse();
    const document = await loadViewableDocument(id, auth);
    if (!document) return documentNotFoundResponse();
    return NextResponse.json(
      { events: await listDocumentEvents(id) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Hujjat tarixini olishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId, updateDocument } from '@/lib/db/document';
import { logDocumentEvent } from '@/lib/documentEvents';

/**
 * Topshirilgan hujjatni qabul qilish: hujjat egasi o'zgaradi va avvalgi egasi
 * ro'yxatidan chiqadi. Jurnalga yoziladi.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const doc = isValidDbId(id) ?
        await prisma.document.findUnique({
          where: { id },
          select: { id: true, ownerId: true, pendingTransferToId: true },
        })
      : null;
    if (!doc || doc.pendingTransferToId !== auth.userId) {
      return NextResponse.json({ message: 'Sizga topshirilgan hujjat topilmadi' }, { status: 404 });
    }

    const previousOwner = doc.ownerId;
    // Bir vaqtda ikki marta bosilsa ham bir marta o'tadi
    const { count } = await prisma.document.updateMany({
      where: { id, pendingTransferToId: auth.userId },
      data: {
        ownerId: auth.userId,
        pendingTransferToId: null,
        pendingTransferAt: null,
        pendingTransferNote: null,
      },
    });
    if (count === 0) {
      return NextResponse.json({ message: 'Hujjat allaqachon qabul qilingan' }, { status: 409 });
    }
    await updateDocument(id, { allowedUserIds: [auth.userId] });
    await logDocumentEvent({
      documentId: id,
      actorId: auth.userId,
      type: 'transfer_accepted',
      note: null,
      targetUserId: previousOwner,
    });
    return NextResponse.json({ message: 'Hujjat qabul qilindi va endi sizda saqlanadi' });
  } catch (error) {
    console.error('Hujjatni qabul qilishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

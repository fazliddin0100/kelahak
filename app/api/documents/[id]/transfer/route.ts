import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/document';
import { findUserById } from '@/lib/db/user';
import { isSameUnitAsCommander } from '@/lib/unitPeerMatch';
import { logDocumentEvent } from '@/lib/documentEvents';
import { DocumentStatus } from '@/types/document-status.enum';

/** Boshliq tasdiqlagan yoki ro'yxatga olingan hujjatni topshirish mumkin */
const TRANSFERABLE = new Set<string>([
  DocumentStatus.APPROVED,
  DocumentStatus.REGISTERED,
  DocumentStatus.ACCEPTED,
]);

async function loadOwn(id: string, userId: string) {
  if (!isValidDbId(id)) return null;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true, pendingTransferToId: true, nomenclatureId: true },
  });
  return doc && doc.ownerId === userId ? doc : null;
}

const notFound = () => NextResponse.json({ message: 'Hujjat topilmadi' }, { status: 404 });

/** Hujjat egasi: hujjatni boshqa xodimga topshirish (u «Qabul qilish» ni bosguncha kutadi) */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const doc = await loadOwn(id, auth.userId);
    if (!doc) return notFound();

    if (!TRANSFERABLE.has(doc.status) || doc.nomenclatureId) {
      return NextResponse.json(
        { message: 'Hujjatni faqat boshliq tasdiqlagandan keyin (ish jildiga tikilmaguncha) topshirish mumkin' },
        { status: 400 }
      );
    }
    if (doc.pendingTransferToId) {
      return NextResponse.json({ message: 'Hujjat allaqachon topshirilgan, qabul qilinishi kutilmoqda' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const toId = typeof body.userId === 'string' ? body.userId : '';
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
    if (!isValidDbId(toId) || toId === auth.userId) {
      return NextResponse.json({ message: 'Qabul qiluvchi xodimni tanlang' }, { status: 400 });
    }

    const [me, target] = await Promise.all([findUserById(auth.userId), findUserById(toId)]);
    if (!me?.personal || !me.job || !target?.personal || !target.job || !target.job.isUserTrue) {
      return NextResponse.json({ message: 'Xodim topilmadi yoki faol emas' }, { status: 400 });
    }
    if (!isSameUnitAsCommander(me.personal, me.job, target.personal, target.job)) {
      return NextResponse.json(
        { message: 'Faqat o‘z viloyatingiz va tashkilotingiz xodimiga topshirish mumkin' },
        { status: 403 }
      );
    }

    await prisma.document.update({
      where: { id },
      data: { pendingTransferToId: toId, pendingTransferAt: new Date(), pendingTransferNote: note || null },
    });
    await logDocumentEvent({ documentId: id, actorId: auth.userId, type: 'transfer_requested', note, targetUserId: toId });
    return NextResponse.json({ message: 'Hujjat topshirildi. Xodim qabul qilgach unga o‘tadi.' });
  } catch (error) {
    console.error('Hujjatni topshirishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

/** Hujjat egasi: qabul qilinmagan topshirishni bekor qilish */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const doc = await loadOwn(id, auth.userId);
    if (!doc) return notFound();
    if (!doc.pendingTransferToId) {
      return NextResponse.json({ message: 'Kutilayotgan topshirish yo‘q' }, { status: 400 });
    }
    await prisma.document.update({
      where: { id },
      data: { pendingTransferToId: null, pendingTransferAt: null, pendingTransferNote: null },
    });
    await logDocumentEvent({
      documentId: id,
      actorId: auth.userId,
      type: 'transfer_cancelled',
      targetUserId: doc.pendingTransferToId,
    });
    return NextResponse.json({ message: 'Topshirish bekor qilindi' });
  } catch (error) {
    console.error('Topshirishni bekor qilishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

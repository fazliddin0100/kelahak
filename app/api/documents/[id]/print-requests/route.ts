import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/document';
import {
  createPrintRequest,
  isPrintableDocument,
  listRequestsForDocument,
  MAX_PRINT_REASON,
} from '@/lib/printRequests';

const notFound = () => NextResponse.json({ message: 'Hujjat topilmadi' }, { status: 404 });

async function loadOwnDocument(id: string, userId: string) {
  if (!isValidDbId(id)) return null;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, ownerId: true, registrationIndex: true, registeredById: true, ownerRegion: true },
  });
  // Chop etishni faqat hujjat egasi so'raydi
  return doc && doc.ownerId === userId ? doc : null;
}

/** Hujjat egasining shu hujjat bo'yicha so'rovlari (holatini ko'rish uchun) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const doc = await loadOwnDocument(id, auth.userId);
    if (!doc) return notFound();
    return NextResponse.json(
      { printable: isPrintableDocument(doc), requests: await listRequestsForDocument(id, auth.userId) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Chop etish so‘rovlarini olishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

/** Yangi so'rov: sababi bilan, hujjatni ro'yxatga olgan kotibiyat xodimiga */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const doc = await loadOwnDocument(id, auth.userId);
    if (!doc) return notFound();
    if (!isPrintableDocument(doc)) {
      return NextResponse.json(
        { message: 'Chop etishni faqat ro‘yxatga olingan hujjat uchun so‘rash mumkin' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 5) {
      return NextResponse.json({ message: 'Chop etish sababini yozing (kamida 5 belgi)' }, { status: 400 });
    }
    if (reason.length > MAX_PRINT_REASON) {
      return NextResponse.json({ message: `Sabab ${MAX_PRINT_REASON} belgidan oshmasin` }, { status: 400 });
    }

    const pending = await prisma.printRequest.count({
      where: { documentId: id, requesterId: auth.userId, status: 'pending' },
    });
    if (pending > 0) {
      return NextResponse.json(
        { message: 'Bu hujjat bo‘yicha so‘rovingiz hali ko‘rib chiqilmoqda' },
        { status: 409 }
      );
    }

    const created = await createPrintRequest({
      documentId: id,
      requesterId: auth.userId,
      assigneeId: doc.registeredById,
      region: doc.ownerRegion,
      reason,
    });
    return NextResponse.json({ message: 'So‘rov kotibiyatga yuborildi', request: created }, { status: 201 });
  } catch (error) {
    console.error('Chop etish so‘rovini yaratishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

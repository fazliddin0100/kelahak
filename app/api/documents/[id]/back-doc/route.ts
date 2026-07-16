// app/api/documents/[id]/back-doc/route.ts
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { findDocuments, isValidDbId, updateDocument } from '@/lib/db/document';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;

        const owned = await findDocuments({ ownerId: user.id }, { take: 1 });
    const document = owned[0];
    if (!document) {
      return NextResponse.json({ message: 'Hujjat mavjud emas!' }, { status: 400 });
    }

    await updateDocument(document.id, {
      sharedWithAdmin: false,
      allowedUserIds: [document.ownerId],
    });

    return NextResponse.json(
      { message: "Hujjat muvaffaqiyatli ro'yxatga olindi" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Nomaʼlum xato';
    console.error('Xatolik:', error);
    return NextResponse.json(
      { message: 'Ichki server xatosi', error: message },
      { status: 500 }
    );
  }
}

import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/mongodb';
import { canGrantDocumentViewAccess } from '@/lib/documentShare';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;
    const currentUserId = userId;


    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const document = await findDocumentById(id, { includeAllowedUsers: true });
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const roleName = role ?? null;
    const docView = serializeDocumentForApi(document);

    if (!canGrantDocumentViewAccess(docView, currentUserId, roleName)) {
      return NextResponse.json(
        { message: "Hujjatni boshqalarga yuborish huquqi yo'q" },
        { status: 403 }
      );
    }

    const { userId: targetUserId } = await request.json();
    if (!targetUserId || !isValidDbId(targetUserId)) {
      return NextResponse.json(
        { message: 'Foydalanuvchi tanlanmadi' },
        { status: 400 }
      );
    }

    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { message: "O'zingizga yuborib bo'lmaydi" },
        { status: 400 }
      );
    }

    const existing = (document.allowedUsers ?? []).map((row) => row.userId);
    if (existing.includes(targetUserId)) {
      return NextResponse.json(
        { message: "Bu foydalanuvchiga allaqachon ko'rish huquqi berilgan" },
        { status: 400 }
      );
    }

    await updateDocument(id, {
      allowedUserIds: [...existing, targetUserId],
    });

    return NextResponse.json(
      {
        message:
          "Foydalanuvchiga hujjatni ko'rish huquqi berildi. U «Mening hujjatlarim» yoki ulashilgan ro'yxatdan ochishi mumkin.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hujjatni ulashishda xatolik:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

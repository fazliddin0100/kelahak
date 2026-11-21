import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { isValidDbId } from '@/lib/db/document';
import { logAdminAction } from '@/lib/auditLog';
import { canHandlePrintRequest, printRequestInclude, toView } from '@/lib/printRequests';

/** Kotibiyat qarori: { action: 'approve' | 'reject', note? } */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    const req = isValidDbId(id) ? await prisma.printRequest.findUnique({ where: { id } }) : null;
    if (
      !req ||
      !canHandlePrintRequest(req, {
        userId: auth.userId,
        role: auth.role,
        province: auth.user.personal?.province,
      })
    ) {
      return NextResponse.json({ message: 'So‘rov topilmadi' }, { status: 404 });
    }
    if (req.status !== 'pending') {
      return NextResponse.json({ message: 'So‘rov allaqachon ko‘rib chiqilgan' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : null;
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
    if (!action) return NextResponse.json({ message: 'Noto‘g‘ri amal' }, { status: 400 });
    if (action === 'rejected' && note.length < 3) {
      return NextResponse.json({ message: 'Rad etish sababini yozing' }, { status: 400 });
    }

    const updated = await prisma.printRequest.update({
      where: { id },
      data: { status: action, decisionNote: note || null, decidedById: auth.userId, decidedAt: new Date() },
      include: printRequestInclude,
    });
    await logAdminAction(
      request,
      auth.userId,
      `Chop etish so'rovi ${action === 'approved' ? 'tasdiqlandi' : 'rad etildi'}: so'rov ${id}, hujjat ${req.documentId}`
    );
    return NextResponse.json({ request: toView(updated) });
  } catch (error) {
    console.error('Chop etish so‘rovi qarorida xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

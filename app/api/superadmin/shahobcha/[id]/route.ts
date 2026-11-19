import { logAdminAction, loginOf } from '@/lib/auditLog';
import { isValidDbId } from '@/lib/db/user';
import { deleteShahobcha, ShahobchaInputError, updateShahobcha } from '@/lib/db/shahobcha';
import { requireSuperAdmin } from '@/lib/superadminAuth';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ id: string }> };

function handleError(e: unknown, action: string) {
  if (e instanceof ShahobchaInputError) {
    return NextResponse.json({ message: e.message }, { status: e.status });
  }
  console.error(`Shahobcha ${action} xatosi:`, e);
  return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  if (!isValidDbId(id)) {
    return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });
  }
  try {
    const body = (await request.json().catch(() => null)) as { name?: unknown; province?: unknown } | null;
    if (!body) return NextResponse.json({ message: 'So‘rov tanasi noto‘g‘ri' }, { status: 400 });
    const updated = await updateShahobcha(id, { name: body.name, province: body.province });
    await logAdminAction(request, check.userId, `Shahobcha o‘zgartirildi: ${id} → «${updated.name}» (${updated.province})`);
    return NextResponse.json({ message: 'Shahobcha o‘zgartirildi', shahobcha: updated });
  } catch (e) {
    return handleError(e, 'o‘zgartirish');
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const check = await requireSuperAdmin(request);
  if (check instanceof NextResponse) return check;
  const { id } = await params;
  if (!isValidDbId(id)) {
    return NextResponse.json({ message: 'Noto‘g‘ri ID' }, { status: 400 });
  }
  try {
    const result = await deleteShahobcha(id);
    await logAdminAction(
      request,
      check.userId,
      `Shahobcha o‘chirildi: «${result.name}», ruxsati olingan foydalanuvchilar: ${result.affectedUsers}`
    );
    return NextResponse.json({
      message:
        result.affectedUsers > 0 ?
          `«${result.name}» o‘chirildi. ${result.affectedUsers} ta foydalanuvchining kirish ruxsati olindi.`
        : `«${result.name}» o‘chirildi.`,
      ...result,
    });
  } catch (e) {
    return handleError(e, 'o‘chirish');
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireAdminOperator } from '@/lib/userAccess';
import { findUserById } from '@/lib/db/user';
import { canAdminManage } from '@/lib/adminScope';
import { logAdminAction } from '@/lib/auditLog';
import { hashPassword, validateNewPassword } from '@/lib/passwordPolicy';

/** Login: kirish tekshiruvi (lib/loginFlow.ts) bilan bir xil — kichik lotin harflari, raqam, «-» va «_»; 3–40 belgi */
const LOGIN_RE = /^[a-z0-9_-]{3,40}$/;

/**
 * Admin: o'z doirasidagi xodimning loginini va/yoki parolini o'zgartirish.
 * Parol o'zgarsa yoki login o'zgarsa — xodimning barcha ochiq sessiyalari yopiladi.
 * Parol hech qachon jurnalga yozilmaydi.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;
    const { id } = await params;

    const [admin, target] = await Promise.all([findUserById(adminCheck.userId), findUserById(id)]);
    if (!admin || !target?.job || !canAdminManage(admin, target)) {
      return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    const targetRole = target.job.role?.role;
    if ((targetRole === 'admin' || targetRole === 'superAdmin') && admin.job?.role?.role !== 'superAdmin') {
      return NextResponse.json({ message: 'Adminlarning login/parolini faqat SuperAdmin o‘zgartiradi' }, { status: 403 });
    }

    const auth = await prisma.auth.findUnique({ where: { userId: id } });
    if (!auth) return NextResponse.json({ message: 'Kirish ma’lumoti topilmadi' }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as { login?: unknown; password?: unknown };
    const data: { login?: string; password?: string } = {};
    const changes: string[] = [];

    if (typeof body.login === 'string' && body.login.trim().toLowerCase() !== auth.login) {
      const login = body.login.trim().toLowerCase();
      if (!LOGIN_RE.test(login)) {
        return NextResponse.json(
          { message: 'Login 3–40 belgi: kichik lotin harflari, raqam, «-» yoki «_» (nuqta va bo‘shliq mumkin emas)' },
          { status: 400 }
        );
      }
      const taken = await prisma.auth.findUnique({ where: { login }, select: { userId: true } });
      if (taken && taken.userId !== id) {
        return NextResponse.json({ message: 'Bu login band, boshqasini tanlang' }, { status: 409 });
      }
      data.login = login;
      changes.push(`login: «${auth.login}» → «${login}»`);
    }

    if (typeof body.password === 'string' && body.password.length > 0) {
      const error = validateNewPassword(body.password);
      if (error) return NextResponse.json({ message: error }, { status: 400 });
      data.password = await hashPassword(body.password);
      changes.push('parol yangilandi');
    }

    if (changes.length === 0) {
      return NextResponse.json({ message: 'O‘zgarish yo‘q' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.auth.update({ where: { userId: id }, data }),
      // Eski parol/login bilan ochilgan sessiyalar yopiladi
      prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    const activeCerts = data.login ?
        await prisma.userCertificate.count({ where: { userId: id, status: 'active' } })
      : 0;
    await logAdminAction(request, adminCheck.userId, `Kirish ma'lumoti o'zgartirildi (${data.login ?? auth.login}): ${changes.join('; ')}`);

    return NextResponse.json({
      message: 'Saqlandi. Xodim yangi ma’lumotlar bilan qayta kiradi.',
      warning:
        activeCerts > 0 ?
          'Xodimning E-IMZO sertifikati eski login uchun berilgan. Kirish ishlayveradi, lekin yangi sertifikat chiqarilganda yangi login ishlatilsin.'
        : undefined,
    });
  } catch (error) {
    console.error('Login/parolni o‘zgartirishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

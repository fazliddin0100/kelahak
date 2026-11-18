// api/users/sessions/grant-access/route.ts
//
// Admin userga tizimga kirish ruxsatini beradi va shu bilan birga
// uning rolini hamda huquqlarini (checkbox orqali tanlangan) yozadi.
// Allaqachon ruxsat berilgan userning huquqlarini yangilash uchun ham ishlatiladi.

import { canAdminManage } from '@/lib/adminScope';
import { commanderExistsInUnit } from '@/lib/commanderSlot';
import { findUserById, isValidDbId } from '@/lib/db/user';
import { prisma } from '@/lib/prisma';
import { isAssignableRole, sanitizePermissions } from '@/lib/roles';
import { requireAdminOperator } from '@/lib/userAccess';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;
    const adminId = adminCheck.userId;

    const admin = await findUserById(adminId);
    if (!admin) {
      return NextResponse.json(
        { error: 'Foydalanuvchi tizimda mavjud emas' },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      userId?: unknown;
      role?: unknown;
      permissions?: unknown;
    } | null;
    const userId = body?.userId;

    if (typeof userId !== 'string' || !isValidDbId(userId)) {
      return NextResponse.json({ error: 'userId majburiy' }, { status: 400 });
    }

    if (userId === adminId) {
      return NextResponse.json(
        { error: "O'zingizga amal bajarish shart emas" },
        { status: 400 },
      );
    }

    const user = await findUserById(userId);
    if (!user || !user.job) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 },
      );
    }

    if (!canAdminManage(admin, user)) {
      return NextResponse.json(
        { error: 'Siz faqat o‘z shahobchangizdagi foydalanuvchilarni boshqara olasiz' },
        { status: 403 },
      );
    }

    const currentRole = user.job.role?.role;
    if (currentRole === 'admin' || currentRole === 'superAdmin') {
      return NextResponse.json(
        { error: 'Shahobcha admini akkauntini faqat SuperAdmin boshqaradi' },
        { status: 403 },
      );
    }

    if (!isAssignableRole(body?.role)) {
      return NextResponse.json({ error: 'Rolni tanlang' }, { status: 400 });
    }
    const role = body.role;
    const permissions = sanitizePermissions(role, body?.permissions);
    if (permissions.length === 0) {
      return NextResponse.json(
        { error: 'Kamida bitta huquqni belgilang' },
        { status: 400 },
      );
    }

    // Bir viloyat + bo'limda faqat bitta komandir
    if (role === 'commander' && currentRole !== 'commander') {
      const taken = await commanderExistsInUnit(
        user.personal?.province ?? '',
        user.job.department ?? '',
      );
      if (taken) {
        return NextResponse.json(
          { error: 'Bu bo‘limda komandir allaqachon bor' },
          { status: 409 },
        );
      }
    }

    const roleChanged = currentRole !== role;

    await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: user.job!.roleId },
        data: { role, permissions },
      });
      await tx.job.update({
        where: { id: user.job!.id },
        data: { isUserTrue: true },
      });
      // Rol o'zgarsa, eski sessiyalar yopiladi — user yangi rol bilan qayta kiradi
      if (roleChanged) {
        await tx.userSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: user.job.isUserTrue ?
          'Foydalanuvchi huquqlari yangilandi'
        : 'Foydalanuvchiga ruxsat va huquqlar berildi',
        role,
        permissions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Allow session error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi!' },
      { status: 500 },
    );
  }
}

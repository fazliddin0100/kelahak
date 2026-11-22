import { type NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { requireAdminOperator } from '@/lib/userAccess';
import { findUserById } from '@/lib/db/user';
import { canAdminManage } from '@/lib/adminScope';
import { logAdminAction } from '@/lib/auditLog';

const FIELDS = {
  name: { label: 'Ism', max: 60, required: true },
  fName: { label: 'Familiya', max: 60, required: true },
  sName: { label: 'Otasining ismi', max: 60, required: false },
  militaryRank: { label: 'Unvon', max: 80, required: false },
  position: { label: 'Lavozim', max: 150, required: false },
  department: { label: 'Bo‘lim', max: 150, required: false },
} as const;

type FieldKey = keyof typeof FIELDS;

/**
 * Admin: o'z doirasidagi (shahobcha yoki viloyat) xodimning shaxsiy va ish ma'lumotlarini tahrirlash.
 * Login o'zgarmaydi (E-IMZO sertifikati loginga bog'langan), rol/huquqlar — «Huquqlar» oynasida.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const adminCheck = await requireAdminOperator(request);
    if (adminCheck instanceof NextResponse) return adminCheck;
    const { id } = await params;

    const [admin, target] = await Promise.all([findUserById(adminCheck.userId), findUserById(id)]);
    if (!admin || !target?.personal || !target.job || !canAdminManage(admin, target)) {
      return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    const targetRole = target.job.role?.role;
    if ((targetRole === 'admin' || targetRole === 'superAdmin') && admin.job?.role?.role !== 'superAdmin') {
      return NextResponse.json({ message: 'Adminlar ma’lumotini faqat SuperAdmin o‘zgartiradi' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const values: Partial<Record<FieldKey, string>> = {};
    for (const key of Object.keys(FIELDS) as FieldKey[]) {
      if (body[key] === undefined) continue;
      const v = typeof body[key] === 'string' ? (body[key] as string).trim().replace(/\s+/g, ' ') : '';
      const rule = FIELDS[key];
      if (rule.required && !v) {
        return NextResponse.json({ message: `${rule.label} bo‘sh bo‘lmasin` }, { status: 400 });
      }
      if (v.length > rule.max) {
        return NextResponse.json({ message: `${rule.label} ${rule.max} belgidan oshmasin` }, { status: 400 });
      }
      values[key] = v;
    }
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ message: 'O‘zgartiriladigan ma’lumot yo‘q' }, { status: 400 });
    }

    const changes: string[] = [];
    const before: Record<string, string> = {
      name: target.personal.name,
      fName: target.personal.fName,
      sName: target.personal.sName,
      militaryRank: target.job.militaryRank,
      position: target.job.position,
      department: target.job.department,
    };
    for (const [k, v] of Object.entries(values)) {
      if (before[k] !== v) changes.push(`${FIELDS[k as FieldKey].label}: «${before[k] ?? ''}» → «${v}»`);
    }
    if (changes.length === 0) return NextResponse.json({ message: 'O‘zgarish yo‘q' });

    await prisma.$transaction([
      prisma.personal.update({
        where: { userId: id },
        data: {
          ...(values.name !== undefined ? { name: values.name } : {}),
          ...(values.fName !== undefined ? { fName: values.fName } : {}),
          ...(values.sName !== undefined ? { sName: values.sName } : {}),
        },
      }),
      prisma.job.update({
        where: { userId: id },
        data: {
          ...(values.militaryRank !== undefined ? { militaryRank: values.militaryRank } : {}),
          ...(values.position !== undefined ? { position: values.position } : {}),
          ...(values.department !== undefined ? { department: values.department } : {}),
        },
      }),
    ]);

    const login = (await prisma.auth.findUnique({ where: { userId: id }, select: { login: true } }))?.login ?? id;
    await logAdminAction(request, adminCheck.userId, `Foydalanuvchi ma'lumoti o'zgartirildi (${login}): ${changes.join('; ')}`);
    return NextResponse.json({ message: 'Ma’lumotlar saqlandi' });
  } catch (error) {
    console.error('Foydalanuvchi ma’lumotini tahrirlashda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

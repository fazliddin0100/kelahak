import type { UserWithRelations } from '@/lib/db/user';
import connectToDatabase, { prisma } from '@/lib/prisma';

/**
 * Admin kimni boshqara oladi:
 * - SuperAdmin — hammani;
 * - shahobchaga biriktirilgan admin — faqat o'z shahobchasidagi xodimlarni;
 * - shahobchasiz (eski) admin — o'z viloyatidagilarni.
 */
export function canAdminManage(
  admin: UserWithRelations,
  target: UserWithRelations
): boolean {
  if (admin.job?.role?.role === 'superAdmin') return true;
  const adminShahobcha = admin.job?.shahobchaId;
  if (adminShahobcha) return target.job?.shahobchaId === adminShahobcha;
  const province = admin.personal?.province;
  return !!province && target.personal?.province === province;
}

/** Admin ko'radigan foydalanuvchilar ro'yxati (o'zi bundan mustasno). */
export async function findUsersForAdmin(admin: UserWithRelations) {
  await connectToDatabase();
  const adminShahobcha = admin.job?.shahobchaId;
  const isSuper = admin.job?.role?.role === 'superAdmin';
  const where =
    isSuper ? {}
    : adminShahobcha ? { job: { shahobchaId: adminShahobcha } }
    : { personal: { province: admin.personal?.province ?? '__none__' } };

  return prisma.user.findMany({
    where: { ...where, NOT: { id: admin.id } },
    include: {
      personal: true,
      job: { include: { role: true, shahobcha: { select: { name: true } } } },
      auth: { select: { login: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

import {
  findUserById,
  isValidDbId,
} from '@/lib/db/user';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { regionsMatch } from '@/lib/documentWorkflow';
import { isKotibiyatStaffRole } from '@/lib/roles';

/** Viloyatdagi kotibiyat / admin (panel) xodimlari */
export async function findKotibiyatStaffUserIds(
  province: string
): Promise<string[]> {
  if (!province.trim()) return [];

  await connectToDatabase();

  const users = await prisma.user.findMany({
    where: {
      personal: {
        province: { equals: province.trim(), mode: 'insensitive' },
      },
    },
    include: {
      job: { include: { role: true } },
    },
  });

  const ids: string[] = [];
  for (const u of users) {
    const job = u.job;
    const roleName = job?.role?.role ?? '';
    const dept = (job?.department ?? '').toLowerCase();

    if (
      isKotibiyatStaffRole(roleName) ||
      dept.includes('kotibiyat') ||
      dept.includes('kotibiyati')
    ) {
      ids.push(u.id);
    }
  }

  return ids;
}

export async function isKotibiyatStaffInProvince(
  userId: string,
  province: string
): Promise<boolean> {
  const staff = await findKotibiyatStaffUserIds(province);
  return staff.includes(userId);
}

export async function assertKotibiyatRecipient(
  recipientUserId: string,
  documentProvince: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isValidDbId(recipientUserId)) {
    return { ok: false, message: 'Noto‘g‘ri qabul qiluvchi' };
  }

  const recipient = await findUserById(recipientUserId);
  if (!recipient?.personal) {
    return { ok: false, message: 'Qabul qiluvchi topilmadi' };
  }

  if (!recipient.personal.province) {
    return { ok: false, message: 'Qabul qiluvchining viloyati topilmadi' };
  }

  if (!regionsMatch(recipient.personal.province, documentProvince)) {
    return {
      ok: false,
      message: 'Qabul qiluvchi hujjat viloyati bilan mos kelmaydi',
    };
  }

  const allowed = await isKotibiyatStaffInProvince(
    recipientUserId,
    documentProvince
  );
  if (!allowed) {
    return {
      ok: false,
      message: 'Faqat kotibiyat xodimiga yuborish mumkin',
    };
  }

  return { ok: true };
}

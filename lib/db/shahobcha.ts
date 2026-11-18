import { createDbId } from '@/lib/db/document';
import { hashPassword, validateNewPassword } from '@/lib/passwordPolicy';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { provinces } from '@/lib/registrationConstants';
import { ALL_PERMISSIONS } from '@/lib/roles';
import validator from 'validator';

const MAX_FIELD_LENGTH = 150;

function clean(value: unknown): string {
  return typeof value === 'string' ? validator.trim(value) : '';
}

/** Ro'yxatdan o'tish formasi uchun: viloyatdagi shahobchalar (faqat nom). */
export async function listShahobchaNames(province: string) {
  await connectToDatabase();
  return prisma.shahobcha.findMany({
    where: { province },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

/** SuperAdmin paneli: shahobchalar, adminlari va xodimlar soni. */
export async function listShahobchalarForSuperAdmin() {
  await connectToDatabase();
  const rows = await prisma.shahobcha.findMany({
    orderBy: [{ province: 'asc' }, { name: 'asc' }],
    include: {
      jobs: {
        select: {
          isUserTrue: true,
          role: { select: { role: true } },
          user: {
            select: {
              id: true,
              personal: { select: { name: true, fName: true, sName: true } },
              auth: { select: { login: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((s) => {
    const admins = s.jobs.filter((j) => j.role.role === 'admin');
    const staff = s.jobs.filter((j) => j.role.role !== 'admin');
    return {
      id: s.id,
      name: s.name,
      province: s.province,
      createdAt: s.createdAt,
      admins: admins.map((a) => ({
        userId: a.user.id,
        login: a.user.auth?.login ?? '',
        fullName: [a.user.personal?.fName, a.user.personal?.name, a.user.personal?.sName]
          .filter(Boolean)
          .join(' '),
      })),
      staffCount: staff.length,
      pendingCount: staff.filter((j) => !j.isUserTrue).length,
    };
  });
}

export class ShahobchaInputError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export interface CreateShahobchaInput {
  name: unknown;
  province: unknown;
  admin: {
    fName: unknown;
    name: unknown;
    sName: unknown;
    position: unknown;
    militaryRank: unknown;
    login: unknown;
    password: unknown;
  };
}

/** Shahobcha va uning adminini (kotibiyat) bitta tranzaksiyada yaratadi. */
export async function createShahobchaWithAdmin(input: CreateShahobchaInput) {
  const name = clean(input.name);
  const province = clean(input.province);
  const a = input.admin ?? ({} as CreateShahobchaInput['admin']);
  const admin = {
    fName: clean(a.fName),
    name: clean(a.name),
    sName: clean(a.sName),
    position: clean(a.position) || 'Kotibiyat',
    militaryRank: clean(a.militaryRank) || '—',
    login: clean(a.login).toLowerCase(),
    password: clean(a.password),
  };

  if (!name || !province || !admin.fName || !admin.name || !admin.sName || !admin.login || !admin.password) {
    throw new ShahobchaInputError('Barcha majburiy maydonlarni to‘ldiring');
  }
  if ([name, admin.fName, admin.name, admin.sName, admin.position, admin.militaryRank].some((v) => v.length > MAX_FIELD_LENGTH)) {
    throw new ShahobchaInputError(`Maydon uzunligi ${MAX_FIELD_LENGTH} belgidan oshmasin`);
  }
  if (!(provinces as readonly string[]).includes(province)) {
    throw new ShahobchaInputError('Viloyat ro‘yxatdan tanlanishi kerak');
  }
  if (!validator.isLength(admin.login, { min: 3, max: 50 }) || !validator.isAlphanumeric(admin.login, 'en-US', { ignore: '_-' })) {
    throw new ShahobchaInputError('Login 3–50 belgi: faqat harf, raqam, _ va -');
  }
  const passwordError = validateNewPassword(admin.password);
  if (passwordError) throw new ShahobchaInputError(passwordError);

  await connectToDatabase();

  const [nameTaken, loginTaken] = await Promise.all([
    prisma.shahobcha.findUnique({ where: { province_name: { province, name } }, select: { id: true } }),
    prisma.auth.findUnique({ where: { login: admin.login }, select: { id: true } }),
  ]);
  if (nameTaken) throw new ShahobchaInputError('Bu viloyatda shunday nomli shahobcha bor', 409);
  if (loginTaken) throw new ShahobchaInputError('Bu login band', 409);

  const hashedPassword = await hashPassword(admin.password);
  const shahobchaId = createDbId();
  const userId = createDbId();
  const roleId = createDbId();

  await prisma.$transaction(async (tx) => {
    await tx.shahobcha.create({ data: { id: shahobchaId, name, province } });
    await tx.user.create({ data: { id: userId } });
    await tx.role.create({
      data: { id: roleId, role: 'admin', province, permissions: [...ALL_PERMISSIONS] },
    });
    await tx.personal.create({
      data: {
        id: createDbId(),
        userId,
        name: admin.name,
        fName: admin.fName,
        sName: admin.sName,
        province,
      },
    });
    await tx.auth.create({
      data: { id: createDbId(), userId, login: admin.login, password: hashedPassword },
    });
    await tx.job.create({
      data: {
        id: createDbId(),
        userId,
        roleId,
        position: admin.position,
        organ: name,
        department: 'Kotibiyat',
        militaryRank: admin.militaryRank,
        isUserTrue: true,
        shahobchaId,
      },
    });
  });

  return { id: shahobchaId, name, province, adminUserId: userId };
}

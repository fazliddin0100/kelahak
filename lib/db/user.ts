import connectToDatabase, { prisma } from '@/lib/prisma';
import { COMMANDER_ROLES } from '@/lib/roles';

export type UserWithRelations = NonNullable<
  Awaited<ReturnType<typeof findUserById>>
>;

const DB_ID_RE = /^[a-f0-9]{24}$/i;

/** Database IDs use a 24-character hexadecimal string format. */
export function isValidDbId(id: string): boolean {
  return DB_ID_RE.test(id);
}

export async function authLoginExists(login: string): Promise<boolean> {
  await connectToDatabase();
  const row = await prisma.auth.findUnique({
    where: { login: login.toLowerCase() },
    select: { id: true },
  });
  return !!row;
}

/** check-user: query param lowercasing qilinmaydi */
export async function authLoginExistsRaw(login: string): Promise<boolean> {
  await connectToDatabase();
  const row = await prisma.auth.findFirst({
    where: { login },
    select: { id: true },
  });
  return !!row;
}

export async function findUsersInProvince(province: string) {
  await connectToDatabase();
  return prisma.user.findMany({
    where: { personal: { province } },
    include: {
      personal: true,
      job: { include: { role: true } },
    },
  });
}

export async function findUsersInProvinceCaseInsensitive(province: string) {
  await connectToDatabase();
  const trimmed = province.trim();
  return prisma.user.findMany({
    where: {
      personal: {
        province: { equals: trimmed, mode: 'insensitive' },
      },
    },
    include: {
      personal: true,
      job: { include: { role: true } },
    },
  });
}

/** Xat oluvchilari: joriy viloyatdagi xodimlar va barcha viloyatlardagi komandirlar */
export async function findLetterRecipientCandidates(province: string) {
  await connectToDatabase();
  const trimmed = province.trim();
  return prisma.user.findMany({
    where: {
      OR: [
        {
          personal: {
            province: { equals: trimmed, mode: 'insensitive' },
          },
        },
        {
          job: {
            role: { role: { in: [...COMMANDER_ROLES] } },
          },
        },
      ],
    },
    include: {
      personal: true,
      job: { include: { role: true } },
    },
  });
}

export async function findUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  await connectToDatabase();
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    include: {
      personal: true,
      job: { include: { role: true } },
    },
  });
}

export async function setJobAccessApproved(
  userId: string,
  isUserTrue: boolean
): Promise<void> {
  await connectToDatabase();
  await prisma.job.update({
    where: { userId },
    data: { isUserTrue },
  });
}

export function serializePersonal(
  personal: NonNullable<UserWithRelations['personal']>
) {
  return { ...personal, _id: personal.id };
}

export function serializeJobForAdminList(
  job: NonNullable<UserWithRelations['job']>
) {
  return {
    position: job.position ?? '',
    organ: job.organ ?? '',
    department: job.department ?? '',
    militaryRank: job.militaryRank ?? '',
    isUserTrue: Boolean(job.isUserTrue),
    roleName: job.role?.role ?? 'user',
  };
}

export async function findUserById(userId: string) {
  await connectToDatabase();
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      personal: true,
      auth: true,
      job: { include: { role: true } },
      devices: { include: { device: true } },
    },
  });
}

export async function findUserByLogin(login: string) {
  await connectToDatabase();
  return prisma.auth.findUnique({
    where: { login: login.toLowerCase() },
    include: {
      user: {
        include: {
          job: { include: { role: true } },
          personal: true,
        },
      },
    },
  });
}

/** Load related user records with Prisma relations. */
export function serializeUser(user: UserWithRelations) {
  return {
    _id: user.id,
    id: user.id,
    personal: user.personal ?
      { ...user.personal, _id: user.personal.id }
    : null,
    auth: user.auth ? { ...user.auth, _id: user.auth.id } : null,
    job:
      user.job ?
        {
          ...user.job,
          _id: user.job.id,
          role: user.job.role ?
            { ...user.job.role, _id: user.job.role.id }
          : null,
        }
      : null,
    devices: user.devices.map((ud) => ({
      ...ud.device,
      _id: ud.device.id,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

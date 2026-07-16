import connectToDatabase, { prisma } from '@/lib/prisma';

/** Bir viloyat + bo‘limda `commander` roli bilan foydalanuvchi bormi */
export async function commanderExistsInUnit(
  province: string,
  department: string
): Promise<boolean> {
  await connectToDatabase();

  const cleanProvince = province.trim();
  const cleanDepartment = department.trim();
  if (!cleanProvince || !cleanDepartment) return false;

  const count = await prisma.job.count({
    where: {
      department: cleanDepartment,
      role: { role: 'commander' },
      user: {
        personal: { province: cleanProvince },
      },
    },
  });

  return count > 0;
}

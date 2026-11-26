import { prisma } from '@/lib/prisma';

/** Imzo qatoriga (author, sender, approvers, bosSigned ...) imzo paytida yoziladigan ma'lumot — QR kod uchun */
export type SignerMeta = { organization: string; signedAt: Date };

/** Imzolovchining tashkiloti (shahobcha nomi) va imzo vaqti */
export async function getSignerMeta(userId: string): Promise<SignerMeta> {
  const job = await prisma.job.findUnique({
    where: { userId },
    select: { organ: true, shahobcha: { select: { name: true } } },
  });
  return {
    organization: (job?.shahobcha?.name || job?.organ || '').trim().slice(0, 200),
    signedAt: new Date(),
  };
}

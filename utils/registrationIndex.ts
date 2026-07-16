import connectToDatabase, { prisma } from '@/lib/prisma';

export const getRegistrationIndex = async (
  ownerRegion: string,
  year: number,
  documentId: string
): Promise<number> => {
  if (!ownerRegion) throw new Error('ownerRegion mavjud emas');
  if (!year) throw new Error('Yil noto‘g‘ri');
  if (!documentId) throw new Error('Hujjat ID mavjud emas');

  await connectToDatabase();

  const existingRecord = await prisma.registration.findUnique({
    where: {
      ownerRegion_year_documentId: { ownerRegion, year, documentId },
    },
  });

  if (existingRecord) {
    return existingRecord.registrationIndex;
  }

  const registrationIndex = await prisma.$transaction(async (tx) => {
    const counter = await tx.registrationCounter.upsert({
      where: { ownerRegion_year: { ownerRegion, year } },
      create: {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
        ownerRegion,
        year,
        seq: 1,
      },
      update: { seq: { increment: 1 } },
    });

    const index = counter.seq;

    await tx.registration.create({
      data: {
        id: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
        ownerRegion,
        year,
        documentId,
        registrationIndex: index,
      },
    });

    return index;
  });

  return registrationIndex;
};

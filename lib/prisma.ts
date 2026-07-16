import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development' ?
        ['warn', 'error']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** Next.js serverless — ulanishni saqlash */
export async function connectToDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL topilmadi. .env faylida DATABASE_URL=postgresql://... qo‘ying.'
    );
  }
  await prisma.$connect();
}

export default connectToDatabase;

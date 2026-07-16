import type {
  Bolim,
  Bolinma,
  Job,
  Nomeklatura,
  Personal,
  Prisma,
  User,
} from '@prisma/client';
import { NomeklaturaStatus } from '@prisma/client';
import connectToDatabase, { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';

export { NomeklaturaStatus, createDbId };

export function isValidDbId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

export type AuthorJson = {
  userId?: string;
  fullName?: string;
  militaryRank?: string;
  position?: string;
  department?: string;
  province?: string;
};

export function provinceEqualsFilter(province: string): Prisma.StringFilter {
  return { equals: province.trim(), mode: 'insensitive' };
}

export function serializeBolim(doc: Bolim) {
  const { id, ...rest } = doc;
  return { ...rest, _id: id };
}

export function serializeBolinma(doc: Bolinma) {
  const { id, ...rest } = doc;
  return { ...rest, _id: id };
}

type NomeklaturaLinkIds = {
  bolimIds?: string[];
  bolinmaIds?: string[];
};

export function serializeNomeklatura(
  doc: Nomeklatura,
  links?: NomeklaturaLinkIds
) {
  const { id, ownerId, creatorId, ...rest } = doc;
  return {
    ...rest,
    _id: id,
    owner: ownerId,
    nameklaturaniYaratganUser: creatorId,
    bolim: links?.bolimIds ?? [],
    bolinma: links?.bolinmaIds ?? [],
  };
}

type PopulatedNomeklatura = Nomeklatura & {
  bolimLinks?: { bolim: Bolim }[];
  bolinmaLinks?: { bolinma: Bolinma }[];
};

function serializeAuthorUser(
  user: User & { personal?: Personal | null; job?: Job | null }
) {
  return {
    _id: user.id,
    personal:
      user.personal ?
        { ...user.personal, _id: user.personal.id }
      : undefined,
    job: user.job ? { ...user.job, _id: user.job.id } : undefined,
  };
}

export function serializeNomeklaturaPopulated(
  doc: PopulatedNomeklatura,
  authorUser?: (User & { personal?: Personal | null; job?: Job | null }) | null
) {
  const author = (doc.author ?? {}) as AuthorJson;
  const base = serializeNomeklatura(doc, {
    bolimIds: doc.bolimLinks?.map((l) => l.bolim.id),
    bolinmaIds: doc.bolinmaLinks?.map((l) => l.bolinma.id),
  });

  return {
    ...base,
    bolim: doc.bolimLinks?.map((l) => serializeBolim(l.bolim)) ?? [],
    bolinma: doc.bolinmaLinks?.map((l) => serializeBolinma(l.bolinma)) ?? [],
    author: {
      ...author,
      userId:
        authorUser ? serializeAuthorUser(authorUser) : author.userId,
    },
  };
}

export async function getNomeklaturaLinkIds(nomeklaturaId: string) {
  const [bolimLinks, bolinmaLinks] = await Promise.all([
    prisma.nomeklaturaBolim.findMany({
      where: { nomeklaturaId },
      select: { bolimId: true },
    }),
    prisma.nomeklaturaBolinma.findMany({
      where: { nomeklaturaId },
      select: { bolinmaId: true },
    }),
  ]);

  return {
    bolimIds: bolimLinks.map((l) => l.bolimId),
    bolinmaIds: bolinmaLinks.map((l) => l.bolinmaId),
  };
}

export async function findArchivedNomeklaturaPopulated() {
  await connectToDatabase();

  const items = await prisma.nomeklatura.findMany({
    where: { status: NomeklaturaStatus.ARCHIVED },
    include: {
      bolimLinks: { include: { bolim: true } },
      bolinmaLinks: { include: { bolinma: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const authorUserIds = [
    ...new Set(
      items
        .map((item) => (item.author as AuthorJson)?.userId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const authorUsers =
    authorUserIds.length > 0 ?
      await prisma.user.findMany({
        where: { id: { in: authorUserIds } },
        include: { personal: true, job: true },
      })
    : [];

  const authorUserById = new Map(authorUsers.map((u) => [u.id, u]));

  return items.map((item) => {
    const authorUserId = (item.author as AuthorJson)?.userId;
    return serializeNomeklaturaPopulated(
      item,
      authorUserId ? (authorUserById.get(authorUserId) ?? null) : null
    );
  });
}

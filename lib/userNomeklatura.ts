import type { UserNomeklaturaRelation } from '@/lib/userNomeklaturaLabels';
import connectToDatabase, { prisma } from '@/lib/prisma';
import {
  NomeklaturaStatus,
  provinceEqualsFilter,
  type AuthorJson,
} from '@/lib/db/nomeklatura';

export type { UserNomeklaturaRelation } from '@/lib/userNomeklaturaLabels';

export type UserNomeklaturaRow = {
  _id: string;
  registrationIndex: string;
  title: string;
  grif: string;
  status: string;
  author?: {
    fullName?: string;
    userId?: string;
  };
  saqlashMuddati?: string | number;
  qonunTuri?: string;
  bolinma?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  nameklaturaniYaratganUser?: string;
  owner?: string;
  relation: UserNomeklaturaRelation;
  canAccept: boolean;
};

export function canUserAcceptNomeklatura(
  item: {
    status?: string;
    ownerId?: string;
    owner?: string;
    author?: { userId?: string };
  },
  userId: string
): boolean {
  if (item.status === NomeklaturaStatus.APPROVED) return false;
  const ownerId = item.ownerId ?? item.owner;
  return (
    ownerId === userId || item.author?.userId === userId
  );
}

function resolveRelation(
  item: {
    _id: string;
    ownerId?: string;
    owner?: string;
    author?: { userId?: string };
    nameklaturaniYaratganUser?: string;
    creatorId?: string;
  },
  userId: string,
  linkedViaDocument: Set<string>
): UserNomeklaturaRelation {
  const id = item._id;
  const ownerId = item.ownerId ?? item.owner;
  const creatorId = item.creatorId ?? item.nameklaturaniYaratganUser;
  if (ownerId === userId) return 'owner';
  if (item.author?.userId === userId) return 'author';
  if (creatorId === userId) return 'creator';
  if (linkedViaDocument.has(id)) return 'document';
  return 'author';
}

/** Tizimga kirgan userga tegishli nomeklaturalar */
export async function fetchUserNomeklaturaGrouped(
  userId: string,
  province: string
) {
  await connectToDatabase();

  const regionFilter = provinceEqualsFilter(province);

  const linkedDocs = await prisma.document.findMany({
    where: {
      ownerId: userId,
      nomenclatureId: { not: null },
      ownerRegion: regionFilter,
    },
    select: { nomenclatureId: true },
    distinct: ['nomenclatureId'],
  });

  const linkedIds = linkedDocs
    .map((d) => d.nomenclatureId)
    .filter((id): id is string => Boolean(id));

  const linkedViaDocument = new Set(linkedIds);

  const raw = await prisma.nomeklatura.findMany({
    where: {
      ownerRegion: regionFilter,
      status: { not: NomeklaturaStatus.ARCHIVED },
      OR: [
        { ownerId: userId },
        { creatorId: userId },
        { author: { path: ['userId'], equals: userId } },
        ...(linkedIds.length > 0 ? [{ id: { in: linkedIds } }] : []),
      ],
    },
    include: {
      bolinmaLinks: { select: { bolinmaId: true } },
    },
    orderBy: { registrationIndex: 'asc' },
  });

  const seen = new Set<string>();
  const nomeklaturalar: UserNomeklaturaRow[] = [];

  for (const item of raw) {
    const id = item.id;
    if (seen.has(id)) continue;
    seen.add(id);

    const author = item.author as AuthorJson;
    const row: UserNomeklaturaRow = {
      _id: id,
      registrationIndex: item.registrationIndex,
      title: item.title,
      grif: item.grif,
      status: item.status,
      author: {
        fullName: author.fullName,
        userId: author.userId,
      },
      saqlashMuddati: item.saqlashMuddati as string | number,
      qonunTuri: item.qonunTuri,
      bolinma: item.bolinmaLinks.map((l) => l.bolinmaId),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      nameklaturaniYaratganUser: item.creatorId,
      owner: item.ownerId,
      relation: resolveRelation(
        {
          _id: id,
          ownerId: item.ownerId,
          creatorId: item.creatorId,
          author,
          nameklaturaniYaratganUser: item.creatorId,
        },
        userId,
        linkedViaDocument
      ),
      canAccept: canUserAcceptNomeklatura(
        {
          status: item.status,
          ownerId: item.ownerId,
          author,
        },
        userId
      ),
    };
    nomeklaturalar.push(row);
  }

  const bolinmaIds = [
    ...new Set(
      nomeklaturalar
        .map((n) => n.bolinma?.[0])
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const bolinmaDocs =
    bolinmaIds.length > 0 ?
      await prisma.bolinma.findMany({
        where: { id: { in: bolinmaIds } },
      })
    : [];

  const bolinmaNameById = new Map(
    bolinmaDocs.map((b) => [b.id, b.bolinma])
  );

  const grouped = new Map<
    string,
    { _id: string; bolinma: string; nomeklaturalar: UserNomeklaturaRow[] }
  >();

  for (const item of nomeklaturalar) {
    const bolinmaId = item.bolinma?.[0] ?? 'other';
    if (!grouped.has(bolinmaId)) {
      grouped.set(bolinmaId, {
        _id: bolinmaId,
        bolinma: bolinmaNameById.get(bolinmaId) ?? 'Boshqa',
        nomeklaturalar: [],
      });
    }
    grouped.get(bolinmaId)!.nomeklaturalar.push(item);
  }

  const results = Array.from(grouped.values()).sort((a, b) =>
    a.bolinma.localeCompare(b.bolinma)
  );

  return { results, total: nomeklaturalar.length };
}

/** User tanlagan nomeklaturaga hujjat biriktira oladimi */
export async function userCanAccessNomeklatura(
  userId: string,
  province: string,
  nomeklaturaId: string
): Promise<boolean> {
  const trimmed = nomeklaturaId.trim();
  if (!trimmed || !/^[a-f0-9]{24}$/i.test(trimmed)) {
    return false;
  }
  const { results } = await fetchUserNomeklaturaGrouped(userId, province);
  const target = trimmed;
  for (const group of results) {
    for (const item of group.nomeklaturalar) {
      if (item._id === target) return true;
    }
  }
  return false;
}

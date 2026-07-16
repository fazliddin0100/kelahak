import {
  Prisma,
  type Document,
  type DocumentContent,
  type Job,
  type Nomeklatura,
  type Personal,
  type User,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import connectToDatabase, { prisma } from '@/lib/prisma';
import {
  findUserById,
  findUsersByIds,
  isValidDbId,
  serializeUser,
  type UserWithRelations,
} from '@/lib/db/user';
import { resolveMongoId } from '@/lib/resolveMongoId';
import { DocumentStatus } from '@/types/document-status.enum';

export { isValidDbId };

/** Mongo ObjectId formatida yangi ID (24 hex) */
export function createDbId(): string {
  return randomBytes(12).toString('hex');
}

export function provinceFilter(province: string): Prisma.StringFilter {
  return { equals: province.trim(), mode: 'insensitive' };
}

type JsonRecord = Record<string, unknown>;

type SignerJson = {
  userId?: unknown;
  fullName?: string;
  militaryRank?: string;
  position?: string;
  hasSigned?: boolean;
  signedAt?: Date | string;
  order?: number;
  viewedAt?: Date | string;
};

export type DocumentWithRelations = Document & {
  content?: DocumentContent | null;
  owner?: (User & { personal?: Personal | null; job?: (Job & { role?: { id: string; role: string } | null }) | null }) | null;
  allowedUsers?: { userId: string }[];
  attachments?: {
    attachmentId: string;
    attachment?: Document | null;
  }[];
  nomenclature?: Nomeklatura | null;
  forwardedBy?: UserWithRelations | null;
};

export type FindDocumentOptions = {
  includeContent?: boolean;
  includeAttachments?: boolean;
  includeOwner?: boolean;
  includeAllowedUsers?: boolean;
  includeNomenclature?: boolean;
  includeForwardedBy?: boolean;
};

export type SerializeDocumentOptions = {
  includeContent?: boolean;
  populateOwner?: boolean;
  populateAuthorUser?: boolean;
  populateSenderUser?: boolean;
  populateReceiverUsers?: boolean;
  populateBosSignedUser?: boolean;
  populateApproversUsers?: boolean;
  populateAttachments?: boolean;
  populateNomenclature?: boolean;
  populateForwardedBy?: boolean;
  userMap?: Map<string, UserWithRelations>;
};

function documentInclude(options: FindDocumentOptions = {}): Prisma.DocumentInclude {
  return {
    content: options.includeContent === true,
    owner:
      options.includeOwner ?
        { include: { personal: true, job: { include: { role: true } } } }
      : false,
    allowedUsers: options.includeAllowedUsers === true,
    attachments:
      options.includeAttachments ?
        { include: { attachment: true } }
      : false,
    nomenclature: options.includeNomenclature === true,
    forwardedBy:
      options.includeForwardedBy ?
        {
          include: {
            personal: true,
            job: { include: { role: true } },
          },
        }
      : false,
  };
}

export async function findDocumentById(
  id: string,
  options: FindDocumentOptions = {}
): Promise<DocumentWithRelations | null> {
  await connectToDatabase();
  return prisma.document.findUnique({
    where: { id },
    include: documentInclude(options),
  }) as Promise<DocumentWithRelations | null>;
}

export async function findDocuments(
  where: Prisma.DocumentWhereInput,
  options: FindDocumentOptions & {
    orderBy?: Prisma.DocumentOrderByWithRelationInput | Prisma.DocumentOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  } = {}
): Promise<DocumentWithRelations[]> {
  await connectToDatabase();
  const { orderBy, skip, take, ...includeOpts } = options;
  return prisma.document.findMany({
    where,
    include: documentInclude(includeOpts),
    orderBy,
    skip,
    take,
  }) as Promise<DocumentWithRelations[]>;
}

export async function countDocuments(where: Prisma.DocumentWhereInput): Promise<number> {
  await connectToDatabase();
  return prisma.document.count({ where });
}

function serializeOwnerPopulated(
  owner: NonNullable<DocumentWithRelations['owner']>
) {
  return {
    _id: owner.id,
    personal:
      owner.personal ?
        { ...owner.personal, _id: owner.personal.id }
      : undefined,
    job:
      owner.job ?
        {
          ...owner.job,
          _id: owner.job.id,
          militaryRank: owner.job.militaryRank,
          position: owner.job.position,
        }
      : undefined,
  };
}

function serializeNomeklaturaRef(n: Nomeklatura) {
  return {
    _id: n.id,
    registrationIndex: n.registrationIndex,
    title: n.title,
    grif: n.grif,
  };
}

function serializeAttachmentRef(doc: Document) {
  return {
    _id: doc.id,
    title: doc.title,
    registrationIndex: doc.registrationIndex,
    ownerRegion: doc.ownerRegion,
    grif: doc.grif,
  };
}

function populateUserRef(
  userId: unknown,
  userMap?: Map<string, UserWithRelations>
): unknown {
  const id = resolveMongoId(userId);
  if (!id) return userId;
  const user = userMap?.get(id);
  if (!user) return id;
  return {
    _id: user.id,
    fullName: user.personal ?
      [user.personal.fName, user.personal.name, user.personal.sName]
        .filter(Boolean)
        .join(' ')
    : undefined,
    militaryRank: user.job?.militaryRank ?? '',
    position: user.job?.position ?? '',
  };
}

function normalizeSignerField(
  value: unknown,
  options?: SerializeDocumentOptions
): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSignerField(item, options));
  }
  const signer = value as SignerJson;
  if (!('userId' in signer)) return value;
  const populated = populateUserRef(signer.userId, options?.userMap);
  return { ...signer, userId: populated };
}

function collectJsonUserIdsFromDoc(doc: Document): string[] {
  const ids = new Set<string>();
  const add = (val: unknown) => {
    const id = resolveMongoId(val);
    if (id) ids.add(id);
  };

  const scan = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    if (typeof value === 'object') {
      const obj = value as SignerJson;
      if (obj.userId !== undefined) add(obj.userId);
    }
  };

  scan(doc.author);
  scan(doc.sender);
  scan(doc.receiver);
  scan(doc.approvers);
  scan(doc.bosSigned);
  scan(doc.forwardedTo);
  scan(doc.forwardedSigner);
  scan(doc.ownerAcceptedBy);
  return [...ids];
}

export function collectJsonUserIds(docs: Document[]): string[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    collectJsonUserIdsFromDoc(doc).forEach((id) => ids.add(id));
  }
  return [...ids];
}

/** API javoblari uchun Mongoose `_id` / populate formatiga moslashtirish */
export function serializeDocumentForApi(
  doc: DocumentWithRelations,
  options: SerializeDocumentOptions = {}
): Record<string, unknown> {
  const {
    id,
    ownerId,
    nomenclatureId,
    forwardedById,
    parentId,
    replyToId,
    content: contentRow,
    owner,
    allowedUsers,
    attachments,
    nomenclature,
    forwardedBy,
    ...meta
  } = doc;

  const result: Record<string, unknown> = {
    ...meta,
    _id: id,
    owner:
      options.populateOwner && owner ?
        serializeOwnerPopulated(owner)
      : ownerId,
    nomenclatureId:
      options.populateNomenclature && nomenclature ?
        serializeNomeklaturaRef(nomenclature)
      : nomenclatureId ?? undefined,
    parentId: parentId ?? undefined,
    replyToId: replyToId ?? undefined,
    forwardedBy:
      options.populateForwardedBy && forwardedBy ?
        serializeUser(forwardedBy as UserWithRelations)
      : forwardedById ?? undefined,
  };

  if (options.includeContent !== false) {
    result.content = contentRow?.content ?? {};
  }

  if (allowedUsers) {
    result.allowedUsers = allowedUsers.map((row) => row.userId);
  }

  if (attachments) {
    result.attachmentText =
      options.populateAttachments ?
        attachments
          .map((row) => row.attachment)
          .filter((a): a is Document => !!a)
          .map(serializeAttachmentRef)
      : attachments.map((row) => row.attachmentId);
  }

  if (options.populateAuthorUser) {
    result.author = normalizeSignerField(doc.author, options);
  } else {
    result.author = doc.author ?? undefined;
  }

  if (options.populateSenderUser) {
    result.sender = normalizeSignerField(doc.sender, options);
  } else {
    result.sender = doc.sender ?? undefined;
  }

  if (options.populateReceiverUsers) {
    result.receiver = normalizeSignerField(doc.receiver, options);
  } else {
    result.receiver = doc.receiver ?? undefined;
  }

  if (options.populateBosSignedUser) {
    result.bosSigned = normalizeSignerField(doc.bosSigned, options);
  } else {
    result.bosSigned = doc.bosSigned ?? undefined;
  }

  if (options.populateApproversUsers) {
    result.approvers = normalizeSignerField(doc.approvers, options);
  } else {
    result.approvers = doc.approvers ?? undefined;
  }

  result.forwardedTo = doc.forwardedTo ?? undefined;
  result.forwardedSigner = doc.forwardedSigner ?? undefined;
  result.ownerAcceptedBy = doc.ownerAcceptedBy ?? undefined;

  return result;
}

export async function serializeDocumentsForApi(
  docs: DocumentWithRelations[],
  options: SerializeDocumentOptions = {}
): Promise<Record<string, unknown>[]> {
  let userMap = options.userMap;
  const needsUsers =
    options.populateAuthorUser ||
    options.populateSenderUser ||
    options.populateReceiverUsers ||
    options.populateBosSignedUser ||
    options.populateApproversUsers;

  if (needsUsers && !userMap) {
    const userIds = collectJsonUserIds(docs);
    const users = await findUsersByIds(userIds);
    userMap = new Map(users.map((u) => [u.id, u as UserWithRelations]));
  }

  return docs.map((doc) =>
    serializeDocumentForApi(doc, { ...options, userMap })
  );
}

/** @deprecated — `serializeDocumentForApi` ishlating */
export function serializeDocument(
  doc: Document & { content?: DocumentContent | null },
  extra?: Partial<Record<string, unknown>>
) {
  return serializeDocumentForApi(doc, { includeContent: true, ...extra });
}

export const documentListSelect = {
  id: true,
  title: true,
  grif: true,
  status: true,
  ownerId: true,
  ownerRegion: true,
  year: true,
  registrationIndex: true,
  createdAt: true,
  updatedAt: true,
  sentToCommander: true,
  submittedToKotibiyat: true,
  sharedWithAdmin: true,
  nomenclatureId: true,
} satisfies Prisma.DocumentSelect;

export const documentListInclude = {
  content: false,
} as const;

export async function syncDocumentAttachments(
  documentId: string,
  attachmentIds: string[]
): Promise<void> {
  await connectToDatabase();
  await prisma.$transaction(async (tx) => {
    await tx.documentAttachment.deleteMany({ where: { documentId } });
    if (attachmentIds.length === 0) return;
    await tx.documentAttachment.createMany({
      data: attachmentIds.map((attachmentId) => ({ documentId, attachmentId })),
      skipDuplicates: true,
    });
  });
}

export async function syncAllowedUsers(
  documentId: string,
  userIds: string[]
): Promise<void> {
  await connectToDatabase();
  const unique = [...new Set(userIds.filter(Boolean))];
  await prisma.$transaction(async (tx) => {
    await tx.documentAllowedUser.deleteMany({ where: { documentId } });
    if (unique.length === 0) return;
    await tx.documentAllowedUser.createMany({
      data: unique.map((userId) => ({ documentId, userId })),
      skipDuplicates: true,
    });
  });
}

export type CreateDocumentInput = {
  title: string;
  content?: unknown;
  grif?: string;
  copyNumber?: string[];
  ownerId: string;
  ownerRegion?: string;
  status?: string;
  author?: unknown;
  sender?: unknown;
  receiver?: unknown;
  approvers?: unknown;
  bosSigned?: unknown;
  attachmentIds?: string[];
  allowedUserIds?: string[];
  createdByKotibiyat?: boolean;
  submittedToKotibiyat?: boolean;
  submittedToKotibiyatAt?: Date;
  sharedWithAdmin?: boolean;
  sentToCommander?: boolean;
  sentToCommanderAt?: Date;
};

export async function createDocument(
  input: CreateDocumentInput
): Promise<DocumentWithRelations> {
  await connectToDatabase();
  const id = createDbId();
  const {
    content,
    attachmentIds,
    allowedUserIds,
    ...fields
  } = input;

  await prisma.$transaction(async (tx) => {
    await tx.document.create({
      data: {
        id,
        title: fields.title,
        grif: fields.grif ?? '',
        copyNumber: fields.copyNumber ?? [],
        ownerId: fields.ownerId,
        ownerRegion: fields.ownerRegion,
        status: fields.status ?? DocumentStatus.YANGI,
        author: (fields.author ?? {}) as Prisma.InputJsonValue,
        sender: (fields.sender ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        receiver: (fields.receiver ?? []) as Prisma.InputJsonValue,
        approvers: (fields.approvers ?? []) as Prisma.InputJsonValue,
        bosSigned: (fields.bosSigned ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        createdByKotibiyat: fields.createdByKotibiyat ?? false,
        submittedToKotibiyat: fields.submittedToKotibiyat ?? false,
        submittedToKotibiyatAt: fields.submittedToKotibiyatAt,
        sharedWithAdmin: fields.sharedWithAdmin ?? false,
        sentToCommander: fields.sentToCommander ?? false,
        sentToCommanderAt: fields.sentToCommanderAt,
      },
    });

    if (content !== undefined && content !== null && content !== '') {
      await tx.documentContent.create({
        data: {
          documentId: id,
          content: (typeof content === 'object' ? content : {}) as Prisma.InputJsonValue,
        },
      });
    }

    if (attachmentIds?.length) {
      await tx.documentAttachment.createMany({
        data: attachmentIds.map((attachmentId) => ({
          documentId: id,
          attachmentId,
        })),
        skipDuplicates: true,
      });
    }

    if (allowedUserIds?.length) {
      await tx.documentAllowedUser.createMany({
        data: [...new Set(allowedUserIds)].map((userId) => ({
          documentId: id,
          userId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const created = await findDocumentById(id, {
    includeContent: true,
    includeAttachments: true,
    includeOwner: true,
  });
  if (!created) throw new Error('Yaratilgan hujjat topilmadi');
  return created;
}

export type UpdateDocumentInput = {
  title?: string;
  content?: unknown;
  grif?: string;
  copyNumber?: string[];
  status?: string;
  author?: unknown;
  sender?: unknown;
  receiver?: unknown;
  approvers?: unknown;
  bosSigned?: unknown;
  forwardedTo?: unknown;
  forwardedSigner?: unknown;
  forwardedComment?: string | null;
  forwardedById?: string | null;
  forwardedAt?: Date | null;
  currentViewIndex?: number;
  ownerAccepted?: boolean;
  ownerAcceptedAt?: Date | null;
  ownerAcceptedBy?: unknown;
  registrationIndex?: number | null;
  year?: number | null;
  ownerRegion?: string | null;
  copyIndex?: number | null;
  copyTotal?: number | null;
  sharedWithAdmin?: boolean;
  submittedToKotibiyat?: boolean;
  submittedToKotibiyatAt?: Date | null;
  sentToCommander?: boolean;
  sentToCommanderAt?: Date | null;
  nomenclatureId?: string | null;
  resolvedAt?: Date | null;
  attachmentIds?: string[];
  allowedUserIds?: string[];
};

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput
): Promise<DocumentWithRelations> {
  await connectToDatabase();
  const {
    content,
    attachmentIds,
    allowedUserIds,
    forwardedById,
    nomenclatureId,
    ...fields
  } = input;

  const data: Prisma.DocumentUpdateInput = { ...(fields as Prisma.DocumentUpdateInput) };
  if (forwardedById !== undefined) {
    data.forwardedBy =
      forwardedById ?
        { connect: { id: forwardedById } }
      : { disconnect: true };
  }
  if (nomenclatureId !== undefined) {
    data.nomenclature =
      nomenclatureId ?
        { connect: { id: nomenclatureId } }
      : { disconnect: true };
  }

  for (const key of [
    'author',
    'sender',
    'receiver',
    'approvers',
    'bosSigned',
    'forwardedTo',
    'forwardedSigner',
    'ownerAcceptedBy',
  ] as const) {
    if (fields[key] !== undefined) {
      (data as Record<string, unknown>)[key] = fields[key] as Prisma.InputJsonValue;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.document.update({ where: { id }, data });

    if (content !== undefined) {
      await tx.documentContent.upsert({
        where: { documentId: id },
        create: {
          documentId: id,
          content: (typeof content === 'object' ? content : {}) as Prisma.InputJsonValue,
        },
        update: {
          content: (typeof content === 'object' ? content : {}) as Prisma.InputJsonValue,
        },
      });
    }

    if (attachmentIds !== undefined) {
      await tx.documentAttachment.deleteMany({ where: { documentId: id } });
      if (attachmentIds.length > 0) {
        await tx.documentAttachment.createMany({
          data: attachmentIds.map((attachmentId) => ({ documentId: id, attachmentId })),
          skipDuplicates: true,
        });
      }
    }

    if (allowedUserIds !== undefined) {
      await tx.documentAllowedUser.deleteMany({ where: { documentId: id } });
      if (allowedUserIds.length > 0) {
        await tx.documentAllowedUser.createMany({
          data: [...new Set(allowedUserIds)].map((userId) => ({
            documentId: id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  const updated = await findDocumentById(id, {
    includeContent: true,
    includeAttachments: true,
    includeAllowedUsers: true,
  });
  if (!updated) throw new Error('Yangilangan hujjat topilmadi');
  return updated;
}

const TERMINAL_STATUSES: DocumentStatus[] = [
  DocumentStatus.REGISTERED,
  DocumentStatus.ACCEPTED,
  DocumentStatus.DELETED,
  DocumentStatus.ARCHIVED,
];

export function commanderLocalInboxWhere(province: string): Prisma.DocumentWhereInput {
  return {
    ownerRegion: provinceFilter(province),
    createdByKotibiyat: { not: true },
    submittedToKotibiyat: { not: true },
    sharedWithAdmin: { not: true },
    sentToCommander: true,
    status: {
      in: [
        DocumentStatus.YANGI,
        DocumentStatus.CREATED,
        DocumentStatus.IN_PROGRESS,
        DocumentStatus.IN_PROGRESS_FORWARD,
        DocumentStatus.SIGNED,
      ],
    },
  };
}

export function kotibiyatRegistrationQueueWhere(
  province: string
): Prisma.DocumentWhereInput {
  return {
    ownerRegion: provinceFilter(province),
    isCopy: { not: true },
    status: { notIn: TERMINAL_STATUSES },
    OR: [
      { createdByKotibiyat: true },
      { submittedToKotibiyat: true },
      { sharedWithAdmin: true },
    ],
  };
}

export function kotibiyatRegionalCopyInboxWhere(
  province: string
): Prisma.DocumentWhereInput {
  return {
    ownerRegion: provinceFilter(province),
    isCopy: true,
    parentId: { not: null },
    submittedToKotibiyat: true,
    createdByKotibiyat: true,
    status: { notIn: TERMINAL_STATUSES },
  };
}

export function commanderExternalInboxWhere(
  commanderProvince: string
): Prisma.DocumentWhereInput {
  return {
    NOT: { ownerRegion: provinceFilter(commanderProvince) },
    status: {
      notIn: [
        DocumentStatus.DELETED,
        DocumentStatus.ARCHIVED,
        DocumentStatus.REGISTERED,
      ],
    },
    AND: [
      {
        OR: [
          { createdByKotibiyat: true },
          { submittedToKotibiyat: true },
          { sharedWithAdmin: true },
        ],
      },
      { sentToCommander: true },
    ],
  };
}

/** Imzo kutilayotgan hujjatlar (signet-documents) */
export async function findPendingSignatureDocuments(
  userId: string,
  province: string
): Promise<DocumentWithRelations[]> {
  const regionDocs = await findDocuments({
    ownerRegion: provinceFilter(province),
  });

  return regionDocs.filter((doc) => {
    const author = doc.author as SignerJson | null;
    const sender = doc.sender as SignerJson | null;
    const bosSigned = doc.bosSigned as SignerJson | null;
    const approvers = doc.approvers as SignerJson[] | null;

    if (author?.userId === userId && author.hasSigned === false) return true;
    if (sender?.userId === userId && sender.hasSigned === false) return true;
    if (Array.isArray(approvers)) {
      if (
        approvers.some(
          (a) => resolveMongoId(a.userId) === userId && a.hasSigned === false
        )
      ) {
        return true;
      }
    }
    if (bosSigned?.hasSigned === false || !bosSigned) return true;
    return false;
  });
}

/** Bos imzosi kutilayotgan hujjatlar */
export async function findPendingBosSignDocuments(
  province: string
): Promise<DocumentWithRelations[]> {
  const docs = await findDocuments({
    ownerRegion: provinceFilter(province),
  });
  return docs.filter((doc) => {
    const bosSigned = doc.bosSigned as SignerJson | null;
    return !bosSigned || bosSigned.hasSigned === false;
  });
}

export async function loadUserContext(userId: string) {
  const user = await findUserById(userId);
  if (!user?.personal) return null;
  const roleName = user.job?.role?.role ?? '';
  return { user, province: user.personal.province, roleName };
}

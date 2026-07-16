// lib/distributeRegionalCopies.ts
//
// Hujjat ro'yxatga olinganida copyNumber dagi viloyatlarga nusxa tarqatadi.
// Har bir viloyat o'z kotibiyat navbatida nusxani ko'radi (copyIndex = indeks+1).

import connectToDatabase, { prisma } from '@/lib/prisma';
import {
  createDbId,
  provinceFilter,
  syncAllowedUsers,
} from '@/lib/db/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { regionsMatch } from './documentWorkflow';
import { findKotibiyatStaffUserIds } from './kotibiyatStaff';

export type SourceDocument = {
  _id: string;
  title?: string;
  content?: unknown;
  grif?: string;
  copyNumber?: string[];
  year?: number;
  registrationIndex?: number;
  owner: string;
  author?: Record<string, unknown>;
  sender?: Record<string, unknown>;
  receiver?: unknown[];
  approvers?: unknown[];
  attachmentText?: string[];
  ownerRegion?: string;
};

export type DistributeResult = {
  created: number;
  regions: string[];
  missing: string[];
  skipped: string[];
};

/** Ro'yxatga olingan asl hujjat uchun nusxa raqami (har doim 1) */
export function resolveSourceCopyMeta(copyNumber?: string[]) {
  const targets = (copyNumber ?? []).map((r) => String(r).trim()).filter(Boolean);
  const copyTotal = Math.max(1, 1 + targets.length);
  return { copyIndex: 1, copyTotal, targets };
}

/**
 * copyNumber[] dagi har bir viloyatga alohida nusxa.
 * Nusxa raqami: massivdagi tartib bo'yicha (0 → 1, 1 → 2, ...).
 */
export async function distributeRegionalCopies(
  source: SourceDocument,
  sourceProvince: string
): Promise<DistributeResult> {
  const { targets, copyTotal } = resolveSourceCopyMeta(source.copyNumber);

  if (targets.length === 0) {
    return { created: 0, regions: [], missing: [], skipped: [] };
  }

  await connectToDatabase();

  let created = 0;
  const regions: string[] = [];
  const missing: string[] = [];
  const skipped: string[] = [];

  for (let index = 0; index < targets.length; index++) {
    const targetRegion = targets[index];
    const copyIndex = index + 1;

    if (regionsMatch(targetRegion, sourceProvince)) {
      skipped.push(targetRegion);
      continue;
    }

    const alreadyExists = await prisma.document.findFirst({
      where: {
        parentId: source._id,
        isCopy: true,
        ownerRegion: provinceFilter(targetRegion),
      },
      select: { id: true },
    });

    if (alreadyExists) {
      skipped.push(targetRegion);
      continue;
    }

    const staffIds = await findKotibiyatStaffUserIds(targetRegion);
    if (staffIds.length === 0) {
      missing.push(targetRegion);
      continue;
    }

    const allowedUserIds = [source.owner, ...staffIds];
    const copyId = createDbId();

    await prisma.$transaction(async (tx) => {
      await tx.document.create({
        data: {
          id: copyId,
          title: source.title,
          grif: source.grif,
          author: (source.author ?? {}) as object,
          sender: (source.sender ?? undefined) as object | undefined,
          receiver: (source.receiver ?? []) as object,
          approvers: (source.approvers ?? []) as object,
          copyNumber: [targetRegion],
          copyIndex,
          copyTotal,
          ownerId: source.owner,
          parentId: source._id,
          isCopy: true,
          ownerRegion: targetRegion,
          sourceRegion: sourceProvince,
          year: source.year,
          registrationIndex: source.registrationIndex,
          status: DocumentStatus.SIGNED,
          createdByKotibiyat: true,
          submittedToKotibiyat: true,
          submittedToKotibiyatAt: new Date(),
          sharedWithAdmin: true,
          sentToCommander: false,
        },
      });

      if (source.content !== undefined && source.content !== null) {
        await tx.documentContent.create({
          data: {
            documentId: copyId,
            content: (typeof source.content === 'object' ?
              source.content
            : {}) as object,
          },
        });
      }

      const attachmentIds = (source.attachmentText ?? []).filter(Boolean);
      if (attachmentIds.length > 0) {
        await tx.documentAttachment.createMany({
          data: attachmentIds.map((attachmentId) => ({
            documentId: copyId,
            attachmentId,
          })),
          skipDuplicates: true,
        });
      }
    });

    await syncAllowedUsers(copyId, allowedUserIds);

    created += 1;
    regions.push(targetRegion);
  }

  return { created, regions, missing, skipped };
}

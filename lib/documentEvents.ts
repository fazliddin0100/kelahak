import { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';

export type DocumentEventType =
  | 'author_signed'
  | 'returned'
  | 'commander_signed'
  | 'resolution'
  | 'acknowledged'
  | 'reforwarded'
  | 'submitted_kotibiyat'
  | 'registered'
  | 'transfer_requested'
  | 'transfer_accepted'
  | 'transfer_cancelled'
  | 'linked_workfile';

export type DocumentEventView = {
  id: string;
  type: string;
  actorName: string;
  note: string | null;
  targetName: string | null;
  createdAt: string;
};

async function userDisplayName(userId: string | null | undefined): Promise<string> {
  if (!userId) return '';
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      personal: { select: { fName: true, name: true, sName: true } },
      job: { select: { position: true } },
    },
  });
  if (!u?.personal) return '';
  const name = `${u.personal.fName} ${u.personal.name} ${u.personal.sName}`.trim();
  return u.job?.position ? `${name} (${u.job.position})` : name;
}

/**
 * Hujjat tarixiga yozuv qo'shadi. Jurnal xatosi asosiy amalni to'xtatmaydi.
 */
export async function logDocumentEvent(params: {
  documentId: string;
  actorId: string | null;
  type: DocumentEventType;
  note?: string | null;
  targetUserId?: string | null;
}): Promise<void> {
  try {
    const [actorName, targetName] = await Promise.all([
      userDisplayName(params.actorId),
      params.targetUserId ? userDisplayName(params.targetUserId) : Promise.resolve(''),
    ]);
    await prisma.documentEvent.create({
      data: {
        id: createDbId(),
        documentId: params.documentId,
        actorId: params.actorId,
        actorName: actorName || 'Tizim',
        type: params.type,
        note: params.note?.trim().slice(0, 1000) || null,
        targetUserId: params.targetUserId ?? null,
        targetName: targetName || null,
      },
    });
  } catch (error) {
    console.error('Hujjat jurnaliga yozishda xato:', error);
  }
}

export async function listDocumentEvents(documentId: string): Promise<DocumentEventView[]> {
  const rows = await prisma.documentEvent.findMany({
    where: { documentId },
    orderBy: { createdAt: 'asc' },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorName: r.actorName,
    note: r.note,
    targetName: r.targetName,
    createdAt: r.createdAt.toISOString(),
  }));
}

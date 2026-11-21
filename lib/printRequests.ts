import { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';
import { regionsMatch } from '@/lib/documentWorkflow';
import { isKotibiyatStaffRole } from '@/lib/roles';

/** Chop etish so'rovi mumkin bo'lgan hujjat: ro'yxatga olingan (raqami bor) */
export function isPrintableDocument(doc: { registrationIndex: number | null }): boolean {
  return doc.registrationIndex != null;
}

export const MAX_PRINT_REASON = 500;

export type PrintRequestView = {
  id: string;
  documentId: string;
  documentTitle: string;
  registrationIndex: number | null;
  region: string | null;
  reason: string;
  status: string;
  decisionNote: string | null;
  requesterName: string;
  assigneeName: string;
  createdAt: string;
  decidedAt: string | null;
  downloadCount: number;
};

const fullName = (p?: { fName: string; name: string; sName: string } | null) =>
  p ? `${p.fName} ${p.name} ${p.sName}`.trim() : '';

const viewInclude = {
  document: { select: { title: true, registrationIndex: true } },
  requester: { select: { personal: { select: { fName: true, name: true, sName: true } } } },
  assignee: { select: { personal: { select: { fName: true, name: true, sName: true } } } },
} as const;

type RowWithView = Awaited<ReturnType<typeof prisma.printRequest.findFirst<{ include: typeof viewInclude }>>>;

export function toView(r: NonNullable<RowWithView>): PrintRequestView {
  return {
    id: r.id,
    documentId: r.documentId,
    documentTitle: r.document.title ?? 'Hujjat',
    registrationIndex: r.document.registrationIndex,
    region: r.region,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    requesterName: fullName(r.requester.personal),
    assigneeName: r.assignee ? fullName(r.assignee.personal) : 'Viloyat kotibiyati',
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    downloadCount: r.downloadCount,
  };
}

/** Kotibiyat xodimi shu so'rovni ko'rib chiqa oladimi */
export function canHandlePrintRequest(
  req: { assigneeId: string | null; region: string | null },
  actor: { userId: string; role: string; province?: string | null }
): boolean {
  if (!isKotibiyatStaffRole(actor.role)) return false;
  if (req.assigneeId) return req.assigneeId === actor.userId;
  // Eski hujjat (ro'yxatga olgan xodim noma'lum) — shu viloyat kotibiyati
  return !!req.region && regionsMatch(req.region, actor.province ?? undefined);
}

export async function createPrintRequest(params: {
  documentId: string;
  requesterId: string;
  assigneeId: string | null;
  region: string | null;
  reason: string;
}) {
  const row = await prisma.printRequest.create({
    data: { id: createDbId(), ...params },
    include: viewInclude,
  });
  return toView(row);
}

export async function listRequestsForDocument(documentId: string, requesterId: string) {
  const rows = await prisma.printRequest.findMany({
    where: { documentId, requesterId },
    include: viewInclude,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return rows.map(toView);
}

export async function listRequestsForKotibiyat(actor: { userId: string; province?: string | null }) {
  const rows = await prisma.printRequest.findMany({
    where: {
      OR: [
        { assigneeId: actor.userId },
        ...(actor.province ? [{ assigneeId: null, region: actor.province }] : []),
      ],
    },
    include: viewInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  // Kutilayotganlar birinchi
  const rank = (s: string) => (s === 'pending' ? 0 : 1);
  return rows.map(toView).sort((a, b) => rank(a.status) - rank(b.status));
}

export const printRequestInclude = viewInclude;

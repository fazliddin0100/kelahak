import { type NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import connectToDatabase from '@/lib/prisma';
import { documentNotFoundResponse, loadViewableDocument } from '@/lib/documentAccess';
import {
  buildPersonalFullName,
  canForwardReviewerSign,
  normalizeForwardQueue,
} from '@/lib/forwardQueue';
import { isSameUnitAsCommander } from '@/lib/unitPeerMatch';
import { isValidDbId, serializeDocumentForApi, updateDocument } from '@/lib/db/document';
import { findUserById, findUsersByIds } from '@/lib/db/user';
import { logDocumentEvent } from '@/lib/documentEvents';
import type { DocumentType } from '@/types/document';

const MAX_COMMENT_LENGTH = 2000;
const MAX_ADD = 20;

/**
 * Rezolyutsiya ijrochisi: hujjat bilan tanishadi va uni o'z rezolyutsiyasi bilan
 * yana boshqa xodim(lar)ga yo'naltiradi. Yangi ijrochilar navbat oxiriga qo'shiladi.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { id } = await params;
    if (!isValidDbId(id)) return documentNotFoundResponse();

    const body = await request.json().catch(() => ({}));
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, MAX_COMMENT_LENGTH) : '';
    const userIds: string[] = [
      ...new Set(
        (Array.isArray(body.userIds) ? body.userIds : []).filter(
          (u: unknown): u is string => typeof u === 'string' && isValidDbId(u) && u !== auth.userId
        )
      ),
    ].slice(0, MAX_ADD) as string[];
    if (userIds.length === 0) {
      return NextResponse.json({ message: 'Kamida bitta xodimni tanlang' }, { status: 400 });
    }
    if (comment.length < 3) {
      return NextResponse.json({ message: 'Rezolyutsiya (topshiriq) matnini yozing' }, { status: 400 });
    }

    const document = await loadViewableDocument(id, auth);
    if (!document) return documentNotFoundResponse();
    const docView = serializeDocumentForApi(document) as unknown as DocumentType;
    if (!canForwardReviewerSign(docView, auth.userId)) {
      return NextResponse.json(
        { message: 'Hujjatni faqat navbatdagi ijrochi yo‘naltira oladi' },
        { status: 403 }
      );
    }

    const actor = await findUserById(auth.userId);
    if (!actor?.personal || !actor.job) {
      return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    const queue = normalizeForwardQueue(docView);
    const already = new Set(queue.filter((q) => !q.hasSigned).map((q) => q.userId));
    const targets = await findUsersByIds(userIds);
    const byId = new Map(targets.map((u) => [u.id, u]));
    let order = queue.reduce((m, q) => Math.max(m, q.order), 0);
    const added = [];
    for (const uid of userIds) {
      const t = byId.get(uid);
      if (!t?.personal || !t.job || already.has(uid)) continue;
      if (!isSameUnitAsCommander(actor.personal, actor.job, t.personal, t.job)) {
        return NextResponse.json(
          { message: 'Faqat o‘z viloyatingiz va tashkilotingizdagi xodimlarni tanlash mumkin' },
          { status: 403 }
        );
      }
      added.push({
        userId: uid,
        fullName: buildPersonalFullName(t.personal),
        militaryRank: t.job.militaryRank ?? '',
        position: t.job.position ?? '',
        order: ++order,
        hasSigned: false,
        assignedById: auth.userId,
        resolution: comment,
      });
    }
    if (added.length === 0) {
      return NextResponse.json({ message: 'Tanlangan xodimlar allaqachon navbatda' }, { status: 400 });
    }

    // Ijrochining o'z navbati «tanishdim» bilan yopiladi, yangilar oxiriga qo'shiladi
    const now = new Date();
    const rawQueue = (Array.isArray(document.forwardedTo) ? document.forwardedTo : []) as Record<string, unknown>[];
    const forwardedTo = [
      ...rawQueue.map((item) =>
        String(item.userId ?? '') === auth.userId && !item.hasSigned ?
          { ...item, hasSigned: true, signedAt: now, viewedAt: item.viewedAt ?? now }
        : item
      ),
      ...added,
    ];
    const nextIdx = forwardedTo.findIndex((q) => !(q as { hasSigned?: boolean }).hasSigned);
    const allowed = new Set((document.allowedUsers ?? []).map((u) => u.userId));
    added.forEach((a) => allowed.add(a.userId));

    await updateDocument(id, {
      forwardedTo,
      currentViewIndex: nextIdx === -1 ? forwardedTo.length : nextIdx,
      allowedUserIds: [...allowed],
    });
    await logDocumentEvent({
      documentId: id,
      actorId: auth.userId,
      type: 'reforwarded',
      note: `${comment}; Ijrochilar: ${added.map((a) => a.fullName).join(', ')}`,
    });

    return NextResponse.json({ message: 'Hujjat rezolyutsiya bilan yo‘naltirildi', added: added.length });
  } catch (error) {
    console.error('Hujjatni qayta yo‘naltirishda xato:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

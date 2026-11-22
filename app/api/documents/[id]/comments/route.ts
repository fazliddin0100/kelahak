import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import {
  documentNotFoundResponse,
  isCommanderActor,
  loadViewableDocument,
} from '@/lib/documentAccess';
import { isDocumentEditableStatus } from '@/lib/documentEditRules';
import { buildForwardedSignerFromUserId } from '@/lib/documentForwardedSigner';
import { buildPersonalFullName } from '@/lib/forwardQueue';
import { isSameUnitAsCommander } from '@/lib/unitPeerMatch';
import { findUserById, findUsersByIds } from '@/lib/db/user';
import connectToDatabase from '@/lib/prisma';
import { isValidDbId, updateDocument } from '@/lib/db/document';
import { type NextRequest, NextResponse } from 'next/server';

const MAX_COMMENT_LENGTH = 2000;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    if (!isCommanderActor(auth)) {
      return NextResponse.json(
        { message: 'Izohni faqat komandir qoldirishi mumkin' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const text = body?.text;
    const comment =
      typeof text === 'string' ? text.trim().slice(0, MAX_COMMENT_LENGTH) : '';
    if (!comment) {
      return NextResponse.json(
        { message: "Izoh matni bo'sh bo'lmasligi kerak" },
        { status: 400 }
      );
    }

    const document = await loadViewableDocument(id, auth);
    if (!document) {
      return documentNotFoundResponse();
    }

    if (!isDocumentEditableStatus(document.status)) {
      return NextResponse.json(
        { message: 'Ro‘yxatga olingan hujjatga izoh qoldirib bo‘lmaydi' },
        { status: 400 }
      );
    }

    // Izoh — hali imzo EMAS: boshliq imzosi faqat «Imzolash» da qo'yiladi.
    // Ism va sana hujjatda izoh ostida ko'rinishi uchun saqlanadi (hasSigned: false).
    const patch: Parameters<typeof updateDocument>[1] = {
      forwardedComment: comment,
      forwardedAt: new Date(),
    };
    const alreadySigned =
      !!(document.forwardedSigner as { hasSigned?: boolean } | null)?.hasSigned ||
      !!(document.bosSigned as { hasSigned?: boolean } | null)?.hasSigned;
    if (!alreadySigned) {
      const signer = await buildForwardedSignerFromUserId(userId);
      if (signer) patch.forwardedSigner = { ...signer, hasSigned: false };
    }

    // Tanlangan xodimlar — rejalashtirilgan ijrochilar (boshliq imzolagach navbat boshlanadi)
    if (Array.isArray(body?.userIds) && !alreadySigned) {
      const ids = [
        ...new Set(
          (body.userIds as unknown[]).filter(
            (u): u is string => typeof u === 'string' && isValidDbId(u) && u !== userId
          )
        ),
      ].slice(0, 50);
      const me = await findUserById(userId);
      const targets = ids.length ? await findUsersByIds(ids) : [];
      const byId = new Map(targets.map((t) => [t.id, t]));
      const queue = [];
      for (const uid of ids) {
        const t = byId.get(uid);
        if (!t?.personal || !t.job || !me?.personal || !me.job) continue;
        if (!isSameUnitAsCommander(me.personal, me.job, t.personal, t.job)) continue;
        queue.push({
          userId: uid,
          fullName: buildPersonalFullName(t.personal),
          militaryRank: t.job.militaryRank ?? '',
          position: t.job.position ?? '',
          order: queue.length + 1,
          hasSigned: false,
        });
      }
      patch.forwardedTo = queue;
      patch.currentViewIndex = 0;
    }

    const updated = await updateDocument(id, patch);

    return NextResponse.json(
      {
        message: 'Izoh saqlandi',
        forwardedComment: updated.forwardedComment,
        forwardedAt: updated.forwardedAt,
        forwardedSigner: updated.forwardedSigner,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Izoh saqlashda xato:', error);
    return NextResponse.json({ message: 'Serverda xatolik' }, { status: 500 });
  }
}

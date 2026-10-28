import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { applyCommanderCommentSignature } from '@/lib/documentForwardedSigner';
import { buildPersonalFullName } from '@/lib/forwardQueue';
import connectToDatabase from '@/lib/prisma';
import { isSameUnitAsCommander } from '@/lib/unitPeerMatch';
import {
  findDocumentById,
  isValidDbId,
  serializeDocumentForApi,
  updateDocument,
} from '@/lib/db/document';
import { findUserById, findUsersByIds } from '@/lib/db/user';
import { DocumentStatus } from '@/types/document-status.enum';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { userId, role, user, department } = auth;
    const currentUserId = userId;


    const { id } = await context.params;
    if (!id || !isValidDbId(id)) {
      return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

    if (userIds.length === 0) {
      return NextResponse.json(
        { message: 'Kamida bitta foydalanuvchi tanlang' },
        { status: 400 }
      );
    }

    const document = await findDocumentById(id, { includeAllowedUsers: true });
    if (!document) {
      return NextResponse.json(
        { message: 'Hujjat topilmadi' },
        { status: 404 }
      );
    }

    const commander = await findUserById(currentUserId);
    if (!commander?.personal || !commander.job) {
      return NextResponse.json(
        { message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    if (!commander.personal.province || !commander.job.organ) {
      return NextResponse.json(
        { message: 'Komandir viloyat yoki masul organi aniqlanmadi' },
        { status: 400 }
      );
    }

    const targetUsers = await findUsersByIds(
      userIds.filter((uid) => isValidDbId(uid))
    );
    const targetById = new Map(targetUsers.map((u) => [u.id, u]));

    const queue = [];
    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];
      if (!isValidDbId(uid)) continue;

      const targetUser = targetById.get(uid);
      if (!targetUser?.personal || !targetUser.job) continue;

      if (
        !isSameUnitAsCommander(
          commander.personal,
          commander.job,
          targetUser.personal,
          targetUser.job
        )
      ) {
        return NextResponse.json(
          {
            message:
              'Faqat komandir bilan bir viloyat va bir xil organ (joy)dagi foydalanuvchilarni tanlash mumkin',
          },
          { status: 403 }
        );
      }

      queue.push({
        userId: uid,
        fullName: buildPersonalFullName(targetUser.personal),
        militaryRank: targetUser.job.militaryRank ?? '',
        position: targetUser.job.position ?? '',
        order: i + 1,
        hasSigned: false,
      });
    }

    if (queue.length === 0) {
      return NextResponse.json(
        { message: 'Tanlangan foydalanuvchilar topilmadi' },
        { status: 400 }
      );
    }

    const allowedSet = new Set<string>(
      (document.allowedUsers ?? []).map((u) => u.userId)
    );
    allowedSet.add(currentUserId);
    allowedSet.add(document.ownerId);
    queue.forEach((q) => allowedSet.add(String(q.userId)));

    const patch: Parameters<typeof updateDocument>[1] = {
      forwardedTo: queue,
      currentViewIndex: 0,
      status: DocumentStatus.IN_PROGRESS_FORWARD,
      allowedUserIds: Array.from(allowedSet),
    };

    await applyCommanderCommentSignature(patch, currentUserId, comment);
    await updateDocument(id, patch);

    const docView = serializeDocumentForApi(
      (await findDocumentById(id))!
    );

    return NextResponse.json(
      {
        message: 'Hujjat navbat bilan yuborildi',
        forwardedTo: queue,
        forwardedComment: docView.forwardedComment,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}

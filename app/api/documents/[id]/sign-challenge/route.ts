// Hujjatni imzolashdan oldin: user E-IMZO talab qilinadiganmi va imzolanadigan matn.
import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import { documentNotFoundResponse, loadViewableDocument } from '@/lib/documentAccess';
import { isValidDbId } from '@/lib/dbId';
import { createChallenge, isEimzoRequired } from '@/lib/eimzo/challenge';
import { computeDocumentHash } from '@/lib/eimzo/documentSign';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!isValidDbId(id)) return NextResponse.json({ message: "Noto'g'ri ID" }, { status: 400 });

    const auth = await requireApiAuth(request, { permission: 'sign_document' });
    if (isAuthError(auth)) return auth;

    const document = await loadViewableDocument(id, auth);
    if (!document) return documentNotFoundResponse();

    if (!(await isEimzoRequired(auth.userId))) {
      return NextResponse.json({ required: false });
    }

    const contentHash = await computeDocumentHash(id);
    if (!contentHash) return documentNotFoundResponse();
    const challenge = await createChallenge(auth.userId, `sign:${id}`);
    return NextResponse.json({
      required: true,
      documentId: id,
      title: document.title ?? '',
      contentHash,
      challengeId: challenge.id,
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Imzo challenge xatosi:', error);
    return NextResponse.json({ message: 'Server xatosi' }, { status: 500 });
  }
}

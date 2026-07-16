import { findUserById } from '@/lib/db/user';

export type ForwardedSignerPayload = {
  userId: string;
  fullName: string;
  militaryRank: string;
  position: string;
  hasSigned: boolean;
  signedAt: Date;
};

export async function buildForwardedSignerFromUserId(
  userId: string
): Promise<ForwardedSignerPayload | null> {
  const user = await findUserById(userId);
  if (!user?.personal) return null;

  const fullName = [user.personal.name, user.personal.fName, user.personal.sName]
    .filter(Boolean)
    .join(' ');

  if (!fullName) return null;

  const now = new Date();
  return {
    userId,
    fullName,
    militaryRank: user.job?.militaryRank ?? '',
    position: user.job?.position ?? '',
    hasSigned: true,
    signedAt: now,
  };
}

type DocumentWithForward = {
  forwardedComment?: string | null;
  forwardedById?: string | null;
  forwardedAt?: Date | null;
  forwardedSigner?: ForwardedSignerPayload | unknown;
};

/** Komandir izohi + imzo (QR uchun) ma’lumotlarini hujjatga yozish */
export async function applyCommanderCommentSignature(
  document: DocumentWithForward,
  userId: string,
  comment?: string
): Promise<void> {
  const trimmed = comment?.trim();
  if (trimmed) {
    document.forwardedComment = trimmed;
  }

  const signer = await buildForwardedSignerFromUserId(userId);
  if (!signer) return;

  document.forwardedById = signer.userId;
  document.forwardedAt = signer.signedAt;
  document.forwardedSigner = signer;
}

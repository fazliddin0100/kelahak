import { findUsersByIds, isValidDbId } from '@/lib/db/user';
import { resolveIdReference } from '@/lib/resolveIdReference';

export type SignerSnapshot = {
  userId: string;
  fullName: string;
  militaryRank: string;
  position: string;
  hasSigned: false;
};

export type ReceiverSnapshot = Omit<SignerSnapshot, 'hasSigned'>;

function inputUserId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = resolveIdReference((value as { userId?: unknown }).userId);
  return id && isValidDbId(id) ? id : null;
}

/**
 * Mijozdan faqat «kim» (userId) olinadi. F.I.O., unvon va lavozim bazadan
 * yoziladi, imzo esa har doim «qo‘yilmagan» holatda boshlanadi — so‘rov
 * tanasidagi `hasSigned` / `signedAt` hech qachon ishlatilmaydi. Imzo faqat
 * imzolovchining o‘zi `/signed` orqali qo‘yganda paydo bo‘ladi.
 */
export async function resolveSignerList(
  input: unknown
): Promise<SignerSnapshot[]> {
  const ids: string[] = [];
  for (const item of Array.isArray(input) ? input : []) {
    const id = inputUserId(item);
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (ids.length === 0) return [];

  const users = await findUsersByIds(ids);
  const byId = new Map(users.map((user) => [user.id, user]));

  return ids.flatMap((id) => {
    const user = byId.get(id);
    if (!user?.personal) return [];
    return [
      {
        userId: id,
        fullName: [user.personal.fName, user.personal.name, user.personal.sName]
          .filter(Boolean)
          .join(' '),
        militaryRank: user.job?.militaryRank ?? '',
        position: user.job?.position ?? '',
        hasSigned: false as const,
      },
    ];
  });
}

export async function resolveSigner(
  input: unknown
): Promise<SignerSnapshot | null> {
  const [signer] = await resolveSignerList([input]);
  return signer ?? null;
}

export async function resolveReceiverList(
  input: unknown
): Promise<ReceiverSnapshot[]> {
  const signers = await resolveSignerList(input);
  return signers.map(({ hasSigned: _hasSigned, ...receiver }) => receiver);
}

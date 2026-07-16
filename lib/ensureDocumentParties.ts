/** Ko‘rinish va saqlashda: sender bo‘sh bo‘lsa author dan to‘ldirish */
export function ensureSenderFromAuthor<T extends Record<string, unknown>>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;

  const author = doc.author as
    | {
        userId?: unknown;
        fullName?: string;
        militaryRank?: string;
        position?: string;
        hasSigned?: boolean;
      }
    | undefined;

  const sender = doc.sender as typeof author | unknown[] | undefined;

  const senderEmpty =
    !sender ||
    (Array.isArray(sender) && sender.length === 0) ||
    (typeof sender === 'object' &&
      !Array.isArray(sender) &&
      !sender.fullName?.trim() &&
      !sender.position?.trim());

  if (!senderEmpty || !author?.fullName?.trim()) return doc;

  return {
    ...doc,
    sender: {
      userId: author.userId,
      fullName: author.fullName,
      militaryRank: author.militaryRank ?? '',
      position: author.position ?? '',
      hasSigned: author.hasSigned ?? false,
    },
  };
}

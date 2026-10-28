import type { File } from '@prisma/client';

/** Preserve the existing API `_id` / `userUploadFile` response shape. */
export function serializeFile(doc: File) {
  const { id, userUploadId, encryptedContent: _encryptedContent, ...rest } = doc;
  return {
    ...rest,
    _id: id,
    userUploadFile: userUploadId,
  };
}

import type { File } from '@prisma/client';

/** API javoblari uchun Mongoose `_id` / `userUploadFile` formatiga moslashtirish */
export function serializeFile(doc: File) {
  const { id, userUploadId, ...rest } = doc;
  return {
    ...rest,
    _id: id,
    userUploadFile: userUploadId,
  };
}

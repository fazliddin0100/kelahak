import { prisma } from '@/lib/prisma';
import { createDbId } from '@/lib/db/document';
import {
  decryptDocumentContent,
  encryptDocumentContent,
} from '@/lib/documentContentEncryption';
import {
  isBlankDocumentType,
  isCustomTypeDocument,
} from '@/lib/resolveDocumentTemplateKey';

/** Bitta userda ko'pi bilan nechta shaxsiy namuna bo'ladi */
export const MAX_USER_TEMPLATES = 50;

export type UserTemplateSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

const templateKey = (title: string) => title.trim().toLowerCase();
// Hujjat kontekstidan ajratish: AAD "doc:tpl_<id>"
const encryptionContext = (id: string) => `tpl_${id}`;

function encryptTemplateContent(html: string, id: string) {
  return encryptDocumentContent(html, encryptionContext(id)) as object;
}

export async function listUserTemplates(
  ownerId: string
): Promise<UserTemplateSummary[]> {
  const rows = await prisma.documentTemplate.findMany({
    where: { ownerId },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: MAX_USER_TEMPLATES,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** Namunani faqat egasi uchun ochadi: { title, content } yoki null */
export async function getUserTemplate(ownerId: string, id: string) {
  const row = await prisma.documentTemplate.findFirst({
    where: { id, ownerId },
  });
  if (!row) return null;
  const decrypted = decryptDocumentContent(row.content, encryptionContext(row.id));
  return {
    title: row.title,
    content: typeof decrypted === 'string' ? decrypted : '',
  };
}

export async function deleteUserTemplate(ownerId: string, id: string) {
  const { count } = await prisma.documentTemplate.deleteMany({
    where: { id, ownerId },
  });
  return count > 0;
}

/**
 * "Yangi hujjat" saqlanganda uning turi va shakli userning namunalariga yoziladi.
 * - Namuna shu hujjatdan yaratilgan bo'lsa: nomi va shakli yangilanadi.
 * - Aks holda shu nomda namuna bo'lmasa: yangisi yaratiladi.
 * - Namunadan yaratilgan boshqa hujjatlar namunani o'zgartirmaydi.
 * Xato hujjatni saqlashga to'sqinlik qilmaydi (chaqiruvchi ushlaydi).
 */
export async function syncTemplateFromDocument(params: {
  ownerId: string;
  documentId: string;
  title: string | null | undefined;
  /** Tozalangan HTML; undefined — matn bu safar yuborilmagan */
  content: string | undefined;
}) {
  const title = (params.title ?? '').trim();
  if (!title || isBlankDocumentType(title) || !isCustomTypeDocument(title)) return;
  const key = templateKey(title);

  const [own, sameName] = await Promise.all([
    prisma.documentTemplate.findFirst({
      where: { ownerId: params.ownerId, sourceDocumentId: params.documentId },
    }),
    prisma.documentTemplate.findUnique({
      where: { ownerId_titleKey: { ownerId: params.ownerId, titleKey: key } },
    }),
  ]);

  if (own) {
    // Boshqa namuna shu nomni egallagan bo'lsa — nomni o'zgartirmaymiz
    const canRename = !sameName || sameName.id === own.id;
    await prisma.documentTemplate.update({
      where: { id: own.id },
      data: {
        ...(canRename ? { title, titleKey: key } : {}),
        ...(params.content !== undefined ?
          { content: encryptTemplateContent(params.content, own.id) }
        : {}),
      },
    });
    return;
  }

  if (sameName) return;

  const count = await prisma.documentTemplate.count({
    where: { ownerId: params.ownerId },
  });
  if (count >= MAX_USER_TEMPLATES) return;

  const id = createDbId();
  await prisma.documentTemplate.create({
    data: {
      id,
      ownerId: params.ownerId,
      title,
      titleKey: key,
      content: encryptTemplateContent(params.content ?? '', id),
      sourceDocumentId: params.documentId,
    },
  });
}

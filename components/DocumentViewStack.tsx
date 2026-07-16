'use client';

import DocumentRenderer from '@/components/DocumentRenderer';
import {
  extractAttachmentIds,
  getPopulatedAttachments,
  toAttachmentDocument,
} from '@/lib/attachmentDocuments';
import { ensureSenderFromAuthor } from '@/lib/ensureDocumentParties';
import { DocumentType } from '@/types/document';
import { useEffect, useMemo, useState } from 'react';

async function fetchAttachmentById(id: string): Promise<DocumentType | null> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`/api/documents/${id}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const data = await res.json();
  return toAttachmentDocument(data);
}

const pageLabelClass =
  'mb-3 w-[210mm] max-w-full text-center text-sm font-semibold text-slate-700';

/** Asosiy hujjat va ilovalar bir qatorda (A4 yonma-yon) */
export default function DocumentViewStack({
  document,
}: {
  document: DocumentType;
}) {
  const main = ensureSenderFromAuthor(
    document as unknown as Record<string, unknown>
  ) as unknown as DocumentType;

  const idsKey = useMemo(
    () => extractAttachmentIds(main.attachmentText).join(','),
    [main.attachmentText]
  );

  const [attachments, setAttachments] = useState<DocumentType[]>(() =>
    getPopulatedAttachments(main)
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const ids = extractAttachmentIds(main.attachmentText);
      if (!ids.length) {
        setAttachments([]);
        return;
      }

      const populated = getPopulatedAttachments(main);
      if (populated.length === ids.length) {
        setAttachments(populated);
        return;
      }

      const loaded = await Promise.all(ids.map((id) => fetchAttachmentById(id)));
      if (!cancelled) {
        setAttachments(loaded.filter((d): d is DocumentType => d !== null));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [main._id, idsKey]);

  return (
    <div className="mx-auto flex w-full flex-row flex-wrap items-start justify-center gap-8 px-2 py-4">
      <article className="flex shrink-0 flex-col items-center">
        <p className={pageLabelClass}>Asosiy hujjat</p>
        <DocumentRenderer document={main} embedded />
      </article>

      {attachments.map((att, index) => (
        <article
          key={att._id || `ilova-${index}`}
          className="flex shrink-0 flex-col items-center print:break-before-page"
          aria-label={`Ilova ${index + 1}`}>
          <p className={pageLabelClass}>
            Ilova{attachments.length > 1 ? ` ${index + 1}` : ''} —{' '}
            {att.title || 'Hujjat'}
          </p>
          <DocumentRenderer document={att} embedded />
        </article>
      ))}
    </div>
  );
}

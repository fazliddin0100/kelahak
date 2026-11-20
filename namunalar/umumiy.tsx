import { DocumentType } from '@/types/document';
import { isBlankDocumentType } from '@/lib/resolveDocumentTemplateKey';
import React from 'react';
import {
  ApproversKelishildi,
  DocumentRegistrationBlock,
  DocumentTopHeader,
  ForwardedReviewersNote,
  resolveAuthorParty,
  sanitizeDocumentHtml,
  SignerBlock,
} from './documentViewShared';

import { DocumentPageShell } from './documentPageShell';

interface UmumiyProps {
  document: DocumentType;
  embedded?: boolean;
}

/**
 * Shablonsiz ("Yangi hujjat") hujjatlar: sarlavha — user kiritgan hujjat turi,
 * qolgan qismi (matn, imzo, kelishildi, ro'yxatga olish) ma'lumotnoma bilan bir xil.
 */
export const Umumiy: React.FC<UmumiyProps> = ({ document, embedded }) => {
  const author = resolveAuthorParty(document);
  const type = isBlankDocumentType(document.title) ? '' : (document.title ?? '').trim();

  return (
    <DocumentPageShell embedded={embedded}>
      <div
        className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-lg box-border"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <DocumentTopHeader document={document} />

        {type ?
          <h1 className="mt-6 text-center text-xl font-bold uppercase tracking-wide">{type}</h1>
        : <p className="mt-6 text-center text-sm italic text-slate-400">Hujjat turi hali kiritilmagan</p>}

        <div
          className="document-html-content mt-4"
          style={{ width: '100%', wordBreak: 'break-word', overflowWrap: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: sanitizeDocumentHtml(document.content) }}
        />

        <SignerBlock party={author} showQr={author.hasSigned} date={document.createdAt} nameFormat="full" />

        <ApproversKelishildi document={document} />
        <ForwardedReviewersNote document={document} />

        <DocumentRegistrationBlock document={document} className="max-w-[300px] flex flex-col text-justify mt-3" />
      </div>
    </DocumentPageShell>
  );
};

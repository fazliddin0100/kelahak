import { DocumentType } from '@/types/document';
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
 * Shablonsiz ("Yangi hujjat") hujjatlar: hujjat nomini user matnning o'zida yozadi,
 * shuning uchun tur sarlavhasi chiqarilmaydi. Qolgani ma'lumotnoma bilan bir xil.
 */
export const Umumiy: React.FC<UmumiyProps> = ({ document, embedded }) => {
  const author = resolveAuthorParty(document);

  return (
    <DocumentPageShell embedded={embedded}>
      <div
        className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-lg box-border"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <DocumentTopHeader document={document} />

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

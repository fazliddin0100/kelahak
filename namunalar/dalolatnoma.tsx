import React from 'react';
import { DocumentType } from '@/types/document';
import {
  ApproversKelishildi,
  DocumentTopHeader,
  DocumentRegistrationBlock,
  ForwardedReviewersNote,
  formatRegistrationLine,
  parseDocDate,
  resolveAuthorParty,
  resolveBosSignedParty,
  sanitizeDocumentHtml,
  SignerBlock,
} from './documentViewShared';
import { format } from 'date-fns';

import { DocumentPageShell } from './documentPageShell';

interface DalolatnomaProps {
  document: DocumentType;
  data?: DocumentType | null;
  embedded?: boolean;
}

export const Dalolatnoma: React.FC<DalolatnomaProps> = ({
  document,
  data,
  embedded,
}) => {
  const bos = resolveBosSignedParty(document);
  const author = resolveAuthorParty(document);
  const showTasdiqlayman =
    !!bos && !!document.forwardedComment?.trim();
  const copyLabel =
    document.copyNumber?.length ?
      `${document.copyNumber.length} -Nusxada`
    : '1 -Nusxada';

  const headerDate = (() => {
    const parsed = parseDocDate(document.createdAt);
    if (!parsed) return '';
    return `${format(parsed, 'yyyy')} yil "${format(parsed, 'dd')}" ${format(parsed, 'MMM').toLowerCase()}`;
  })();

  return (
    <DocumentPageShell
      embedded={embedded}
      outerClassName="flex flex-col justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] overflow-x-hidden font-serif">
      <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-lg box-border">
        <DocumentTopHeader document={document} />

        {showTasdiqlayman && bos ?
          <div className="flex flex-row justify-between items-center mt-2">
            <span className="max-w-[40%]" />
            <span className="max-w-[60%]">
              <p className="font-bold">&#34;TASDIQLAYMAN&#34;</p>
              <SignerBlock
                party={bos}
                showQr={bos.hasSigned}
                date={document.createdAt}
              />
            </span>
          </div>
        : null}

        <div className="flex flex-col justify-center items-center mt-3">
          {document.title ?
            <p className="font-bold">{document.title.toUpperCase()}</p>
          : null}
          <span className="flex w-full justify-between items-center gap-4 mt-4">
            {headerDate ?
              <span>
                <i>{headerDate}</i>
              </span>
            : null}
            {document.registrationIndex ?
              <span>
                <u>
                  {formatRegistrationLine(
                    data?.province ?? document.ownerRegion,
                    document.registrationIndex,
                    document.grif
                  )}
                </u>
              </span>
            : null}
          </span>
        </div>

        <div
          className="w-full wrap-break-word document-html-content mt-4"
          dangerouslySetInnerHTML={{
            __html: sanitizeDocumentHtml(document.content),
          }}
        />

        <SignerBlock
          party={author}
          showQr={author.hasSigned}
          date={document.createdAt}
          nameFormat="full"
        />

        <ApproversKelishildi document={document} />
        <ForwardedReviewersNote document={document} />

        <DocumentRegistrationBlock
          document={document}
          province={data?.province}
          className="max-w-[300px] flex flex-col text-justify mt-3"
        />

        {!bos && copyLabel ?
          <p className="text-right text-sm text-slate-600">{copyLabel}</p>
        : null}
      </div>
    </DocumentPageShell>
  );
};

import gerb from '@/public/gerb.png';
import { DocumentType } from '@/types/document';
import { format } from 'date-fns';
import Image from 'next/image';
import React from 'react';
import {
  DocumentTopHeader,
  formatGrifDisplay,
  hasPartyData,
  parseDocDate,
  resolveApproverParty,
  sanitizeDocumentHtml,
} from './documentViewShared';

import { DocumentPageShell } from './documentPageShell';

interface BuyruqProps {
  document: DocumentType;
  embedded?: boolean;
}

export const Buyruq: React.FC<BuyruqProps> = ({ document, embedded }) => {
  const createdDate = parseDocDate(document.createdAt);

  const getMonthUz = (monthIndex: number): string => {
    const months = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul',
      'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
    ];
    return months[monthIndex];
  };

  const formatPosition = (position?: string): string => {
    if (!position?.trim()) return '';
    const cleaned = position.replace(/DXX/i, '').trim();
    return cleaned.split(/\s+/).map((p) => p.toUpperCase()).join(' ');
  };

  const formatPositionList = (position?: string): string => {
    if (!position?.trim()) return '';
    return position.replace(/DXX/i, '').trim().split(/\s+/).filter(Boolean).join(' ');
  };

  const headerPosition =
    formatPosition(document.position) ||
    formatPosition(document.author?.position);

  const approvers = (document.approvers ?? []).filter((a) =>
    hasPartyData(resolveApproverParty(a))
  );

  return (
    <DocumentPageShell
      embedded={embedded}
      outerClassName="flex justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] text-[18.66px]">
      <div
        className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-[16px] box-border"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <DocumentTopHeader
          document={document}
          copyCount={document.copyNumber?.length ?? 1}
        />

        <div className="flex flex-col justify-center items-center text-center">
          {gerb ?
            <Image
              src={gerb}
              alt="O‘zbekiston Respublikasi gerbi"
              width={80}
              height={80}
            />
          : null}
          <p className="font-bold mt-1">
            BUXORO VILOYATI HOKIMIYATI <br />
            {headerPosition ? `${headerPosition}NING` : null} <br />
            BUYRUG‘I
          </p>
          <div className="h-px w-full bg-black mb-0.5" />
          <div className="h-1.5 w-full bg-black" />

          <div className="flex justify-between items-center mt-2 w-full text-[18px]">
            {createdDate ?
              <span suppressHydrationWarning>
                <i>
                  {format(createdDate, 'yyyy')} yil &#34;
                  <span style={{ textDecoration: 'underline' }}>
                    {format(createdDate, 'dd')}
                  </span>
                  &#34; {getMonthUz(createdDate.getMonth())}
                </i>
              </span>
            : <span />}
            <span>
              <u>
                <i>
                  1111 /{formatGrifDisplay(document.grif) || '—'}
                </i>
              </u>
              -son
            </span>
          </div>
        </div>

        <div
          className="mt-[3rem] document-html-content"
          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
          dangerouslySetInnerHTML={{
            __html: sanitizeDocumentHtml(document.content),
          }}
        />

        {approvers.length > 0 && (
          <div className="w-full mt-16">
            <p className="text-center font-bold">
              O‘zbekiston Respublikasi Davlat Xavfsizlik Xizmati{' '}
              {formatPositionList(document.position) || headerPosition || ''}ning
              buyruq loyihasiga
            </p>
            <p className="text-center font-bold">KELISHUV VAROG‘I</p>
            {approvers.map((approver, index) => {
              const p = resolveApproverParty(approver);
              return (
                <div key={index} className="mt-2">
                  {p.position ?
                    <p className="max-w-[400px] font-bold">{p.position}</p>
                  : null}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </DocumentPageShell>
  );
};

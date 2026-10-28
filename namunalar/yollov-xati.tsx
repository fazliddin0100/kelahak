import QrCode from '@/helpers/qr-code';
import { isAttachmentRef } from '@/lib/attachmentDocuments';
import logo from '@/public/dxxLogo.png';
import { DocumentType } from '@/types/document';
import { format } from 'date-fns';
import Image from 'next/image';
import {
  ApproversKelishildi,
  DocumentTopHeader,
  ForwardedReviewersNote,
  formatIlovaAttachmentLabel,
  formatRegistrationLineSlash,
  formatShortName,
  hasPartyData,
  parseDocDate,
  resolveBosSignedParty,
  resolveSenderParty,
  sanitizeDocumentHtml,
} from './documentViewShared';

import { DocumentPageShell } from './documentPageShell';

interface YollovXatiProps {
  document: DocumentType;
  data?: DocumentType | null;
  embedded?: boolean;
}

export const YollovXati = ({ document, embedded }: YollovXatiProps) => {
  const sender = resolveSenderParty(document);
  const createdDate = parseDocDate(document.createdAt);
  const registrationLine = formatRegistrationLineSlash(
    document.ownerRegion,
    document.registrationIndex,
    document.grif
  );
  const isSigned = sender.hasSigned;

  const getMonthUz = (monthIndex: number): string => {
    const months = [
      'yanvar',
      'fevral',
      'mart',
      'aprel',
      'may',
      'iyun',
      'iyul',
      'avgust',
      'sentyabr',
      'oktyabr',
      'noyabr',
      'dekabr',
    ];
    return months[monthIndex];
  };

  const renderReceiverInfo = () => {
    interface PartyItem {
      position?: string;
      militaryRank?: string;
      fullName?: string;
      hasSigned?: boolean;
    }

    const isPartyItem = (item: unknown): item is PartyItem =>
      typeof item === 'object' && item !== null && !Array.isArray(item);

    const forwardedList = ((document.forwardedTo ?? []) as unknown[]).filter(
      (r) => {
        if (!isPartyItem(r)) return false;
        return hasPartyData({
          position: r.position,
          militaryRank: r.militaryRank,
          fullName: r.fullName,
          hasSigned: !!r.hasSigned,
        });
      }
    ) as PartyItem[];
    const baseList = ((document.receiver ?? []) as unknown[]).filter((r) => {
      if (!isPartyItem(r)) return false;
      return hasPartyData({
        position: r.position,
        militaryRank: r.militaryRank,
        fullName: r.fullName,
        hasSigned: false,
      });
    }) as PartyItem[];
    const list = forwardedList.length > 0 ? forwardedList : baseList;

    if (list.length === 0) return null;
    if (list.length > 1) {
      return <p>Viloyat komandirlariga</p>;
    }

    const single = list[0];
    return (
      <>
        {single.position ?
          <p>{single.position}</p>
        : null}
        <span className="flex justify-start items-center gap-4 mt-2">
          {single.militaryRank ?
            <span>{single.militaryRank}</span>
          : null}
          {single.fullName ?
            <span className="ml-2">
              {formatShortName(single.fullName) || single.fullName}ga
            </span>
          : null}
        </span>
      </>
    );
  };

  const commanderParty =
    document.forwardedSigner ?
      {
        position: document.forwardedSigner.position ?? '',
        militaryRank: document.forwardedSigner.militaryRank ?? '',
        fullName: document.forwardedSigner.fullName ?? '',
        hasSigned: !!document.forwardedSigner.hasSigned,
      }
    : resolveBosSignedParty(document);

  const renderCommanderHeaderInfo = () => {
    if (!commanderParty || !hasPartyData(commanderParty)) return null;
    return (
      <div className="font-bold">
        <span className="mt-2 flex items-center gap-2">
          {commanderParty.hasSigned && commanderParty.fullName ?
            <span className="shrink-0">
              <QrCode
                fullNames={commanderParty.fullName}
                size={30}
                logoSize={10}
              />
            </span>
          : null}
          {commanderParty.fullName ?
            <span>
              {formatShortName(commanderParty.fullName) ||
                commanderParty.fullName}
            </span>
          : null}
        </span>
      </div>
    );
  };

  return (
    <DocumentPageShell
      embedded={embedded}
      outerClassName="flex justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] text-[18.66px]">
      <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-[16px] box-border">
        <DocumentTopHeader document={document} showCommanderLeft={false} />

        <div className="flex flex-col justify-center items-center text-center">
          <Image src={logo} alt="logo" width={100} height={100} />
          <p className="font-bold mt-1">BUXORO VILOYATI HOKIMIYATI</p>
          <div className="h-1 bg-black mb-0.5 w-full" />
          <div className="h-1 bg-black mb-0.5 w-full" />

          <div className="mt-2 flex w-full items-center justify-between gap-4 text-[18px]">
            {createdDate ?
              <span className="text-left" suppressHydrationWarning>
                {format(createdDate, 'yyyy')} yil &#34;
                <span style={{ textDecoration: 'underline' }}>
                  {format(createdDate, 'dd')}
                </span>
                &#34; {getMonthUz(createdDate.getMonth())}
              </span>
            : <span />}
            {registrationLine ?
              <span className="shrink-0 text-right">
                <u>{registrationLine}</u>
              </span>
            : <span />}
          </div>
        </div>

        {(renderCommanderHeaderInfo() || renderReceiverInfo()) && (
          <div className="flex flex-row justify-between items-center mt-4">
            <span className="max-w-[55%]">{renderCommanderHeaderInfo()}</span>
            <span className="max-w-[55%] font-bold text-right">
              <span className="inline-block text-left">
                {renderReceiverInfo()}
              </span>
            </span>
          </div>
        )}

        <div className="mt-10 document-html-content wrap-break-word text-[18px]">
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeDocumentHtml(document.content),
            }}
          />
        </div>

        {document.attachmentText && document.attachmentText.length > 0 && (
          <div className="mt-6 flex w-full flex-row items-start gap-3">
            <p className="shrink-0 px-10 font-bold text-[18px]">Ilova:</p>
            <div className="min-w-0 flex-1">
              {document.attachmentText.map((item, index) => (
                <p key={index} className="text-[18px] leading-snug">
                  {index + 1}.{' '}
                  {isAttachmentRef(item) ?
                    formatIlovaAttachmentLabel(item)
                  : 'Ilova hujjati'}
                </p>
              ))}
            </div>
          </div>
        )}

        {hasPartyData(sender) && (
          <div className="mt-4 w-full text-[18px] font-bold">
            <span className="min-w-[40%]">
              {sender.position ?
                <span className="inline-block align-top w-[400px] overflow-hidden text-ellipsis whitespace-normal">
                  {sender.position}
                </span>
              : null}
              <br />
              <span className="flex items-center gap-4">
                {sender.militaryRank ?
                  <span>{sender.militaryRank}</span>
                : null}
                {isSigned && sender.fullName ?
                  <span>
                    <QrCode fullNames={sender.fullName} />
                  </span>
                : null}
                {sender.fullName ?
                  <span>{sender.fullName}</span>
                : null}
              </span>
            </span>
          </div>
        )}

        <ApproversKelishildi document={document} />
        <ForwardedReviewersNote document={document} />
      </div>
    </DocumentPageShell>
  );
};

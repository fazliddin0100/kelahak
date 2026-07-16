import QrCode from '@/helpers/qr-code';
import { DocumentType } from '@/types/document';
import DOMPurify from 'dompurify';
import React from 'react';
import {
  ApproversKelishildi,
  DocumentRegistrationBlock,
  DocumentTopHeader,
  formatShortName,
  ForwardedReviewersNote,
  getCommanderCommentMeta,
  hasPartyData,
  resolveBosSignedParty,
  resolveSenderParty,
  sanitizeDocumentHtml,
  SignerBlock,
} from './documentViewShared';

import { DocumentPageShell } from './documentPageShell';

interface BildirgiProps {
  document: DocumentType;
  province?: string;
  embedded?: boolean;
}

export const Bildirgi: React.FC<BildirgiProps> = ({
  document,
  province,
  embedded,
}) => {
  const sender = resolveSenderParty(document);

  type PartyRecipient = {
    position?: string;
    militaryRank?: string;
    fullName?: string;
    hasSigned?: boolean;
    order?: number;
  };

  const isPartyItem = (item: unknown): item is PartyRecipient =>
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
  ) as PartyRecipient[];

  const baseList = ((document.receiver ?? []) as unknown[]).filter((r) => {
    if (!isPartyItem(r)) return false;
    return hasPartyData({
      position: r.position,
      militaryRank: r.militaryRank,
      fullName: r.fullName,
      hasSigned: false,
    });
  }) as PartyRecipient[];

  const forwardQueue = [...forwardedList].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const commander = getCommanderCommentMeta(document);
  const commanderParty =
    document.forwardedSigner ?
      {
        position: document.forwardedSigner.position ?? '',
        militaryRank: document.forwardedSigner.militaryRank ?? '',
        fullName: document.forwardedSigner.fullName ?? '',
        hasSigned: !!document.forwardedSigner.hasSigned,
      }
    : resolveBosSignedParty(document);

  const renderReceiverBlock = () => {
    const list = baseList.length > 0 ? baseList : forwardQueue;
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
        <span className="mt-2 flex items-center gap-4">
          {single.militaryRank ? <span>{single.militaryRank}</span> : null}
          {single.fullName ?
            <span>
              {formatShortName(single.fullName) || single.fullName}ga
            </span>
          : null}
        </span>
      </>
    );
  };

  const commanderSignerName =
    commander.signerName?.trim() || commanderParty?.fullName?.trim() || '';

  const renderCommanderLeft = () => {
    const showQr =
      (commander.showQr || commanderParty?.hasSigned) && !!commanderSignerName;

    if (commander.text) {
      return (
        <div>
          <p className="whitespace-pre-wrap commander-comment-hand">
            {commander.text}
          </p>
          <div
            className="mt-1.5 max-w-[min(100%,280px)] border-b-[2.5px] border-slate-800"
            aria-hidden
          />
          {forwardQueue.length > 0 ?
            <ol className="mt-2 space-y-2 text-base font-bold">
              {forwardQueue.map((item, i) => {
                const shortName =
                  item.fullName ?
                    formatShortName(item.fullName) || item.fullName
                  : '—';
                return (
                  <li
                    key={`fwd-q-${i}`}
                    className="flex items-center gap-2 leading-snug">
                    <span className="shrink-0">{i + 1}.</span>
                    <span className="inline-flex items-center gap-2">
                      {item.hasSigned && item.fullName ?
                        <QrCode
                          fullNames={item.fullName}
                          size={30}
                          logoSize={10}
                        />
                      : null}
                      <span>{shortName}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          : null}
          {showQr ?
            <div className="mt-2 inline-flex items-center gap-2">
              <QrCode fullNames={commanderSignerName} size={30} logoSize={10} />
              <span>{formatShortName(commanderSignerName)}</span>
            </div>
          : null}
        </div>
      );
    }
    if (!hasPartyData(commanderParty)) return null;
    return (
      <span className="inline-flex items-center gap-2">
        {commanderParty?.hasSigned && commanderParty.fullName ?
          <QrCode fullNames={commanderParty.fullName} size={30} logoSize={10} />
        : null}
        {commanderParty?.fullName ?
          <span>{formatShortName(commanderParty.fullName)}</span>
        : null}
      </span>
    );
  };

  const nusxa =
    document.copyNumber?.length === 0 ? 1 : (document.copyNumber?.length ?? 1);

  return (
    <DocumentPageShell embedded={embedded}>
      <div className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white shadow-lg pl-20 pt-[30px] pr-[30px] pb-[30px] text-lg box-border">
        <DocumentTopHeader
          document={document}
          copyCount={nusxa}
          showCommanderLeft={false}
        />

        {(renderCommanderLeft() || renderReceiverBlock()) && (
          <div className="mt-4 flex flex-row items-start justify-between gap-4 font-bold">
            <span className="max-w-[55%]">{renderCommanderLeft()}</span>
            <span className="max-w-[55%] text-right">
              <span className="inline-block text-left">
                {renderReceiverBlock()}
              </span>
            </span>
          </div>
        )}

        <div
          className="mt-4 w-full wrap-break-words document-html-content"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(sanitizeDocumentHtml(document.content)),
          }}
        />

        <SignerBlock
          party={sender}
          showQr={sender.hasSigned}
          date={document.createdAt}
        />

        <DocumentRegistrationBlock document={document} province={province} />

        <ApproversKelishildi document={document} />
        <ForwardedReviewersNote document={document} />
      </div>
    </DocumentPageShell>
  );
};

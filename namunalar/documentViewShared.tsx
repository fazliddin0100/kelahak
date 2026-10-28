import QrCode from '@/helpers/qr-code';
import { Approver, DateLike, DocumentType } from '@/types/document';
import { DocumentStatus } from '@/types/document-status.enum';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';

export type DocumentParty = {
  position: string;
  militaryRank: string;
  fullName: string;
  hasSigned: boolean;
};

export function hasPartyData(
  p: Partial<DocumentParty> | null | undefined
): boolean {
  if (!p) return false;
  return !!(p.fullName?.trim() || p.position?.trim() || p.militaryRank?.trim());
}

/** Muallif yoki jo‘natuvchi (bildirgi, xat va h.k.) */
export function resolveSenderParty(doc: DocumentType): DocumentParty {
  const s = doc.sender as Partial<DocumentParty> | undefined;
  const a = doc.author as Partial<DocumentParty> | undefined;
  return {
    position:
      s?.position?.trim() || a?.position?.trim() || doc.position?.trim() || '',
    militaryRank:
      s?.militaryRank?.trim() ||
      a?.militaryRank?.trim() ||
      doc.militaryRank?.trim() ||
      '',
    fullName:
      s?.fullName?.trim() || a?.fullName?.trim() || doc.fullName?.trim() || '',
    hasSigned: !!(s?.hasSigned ?? a?.hasSigned),
  };
}

/** Muallif (ma’lumotnoma, dalolatnoma) */
export function resolveAuthorParty(doc: DocumentType): DocumentParty {
  const a = doc.author as Partial<DocumentParty> | undefined;
  const s = doc.sender as Partial<DocumentParty> | undefined;
  return {
    position:
      a?.position?.trim() || s?.position?.trim() || doc.position?.trim() || '',
    militaryRank:
      a?.militaryRank?.trim() ||
      s?.militaryRank?.trim() ||
      doc.militaryRank?.trim() ||
      '',
    fullName:
      a?.fullName?.trim() || s?.fullName?.trim() || doc.fullName?.trim() || '',
    hasSigned: !!(a?.hasSigned ?? s?.hasSigned),
  };
}

export function resolveBosSignedParty(doc: DocumentType): DocumentParty | null {
  const b = doc.bosSigned as Partial<DocumentParty> | undefined;
  if (!b && !doc.forwardedSigner) return null;
  const fs = doc.forwardedSigner;
  const party: DocumentParty = {
    position: b?.position?.trim() || fs?.position?.trim() || '',
    militaryRank: b?.militaryRank?.trim() || fs?.militaryRank?.trim() || '',
    fullName: b?.fullName?.trim() || fs?.fullName?.trim() || '',
    hasSigned: !!(b?.hasSigned ?? fs?.hasSigned),
  };
  return hasPartyData(party) ? party : null;
}

export function resolveApproverParty(a: Approver): DocumentParty {
  return {
    position: a.position?.trim() || '',
    militaryRank: a.militaryRank?.trim() || '',
    fullName: a.fullName?.trim() || '',
    hasSigned: !!a.hasSigned,
  };
}

export function formatGrifDisplay(grif?: string): string {
  if (!grif?.trim()) return '';
  return grif.charAt(0).toUpperCase() + grif.slice(1).toLowerCase();
}

/** Viloyat: Buxoro → B */
export function getRegionLetter(region?: string): string {
  const r = region?.trim();
  if (!r) return '';
  return r.charAt(0).toUpperCase();
}

/** Ro‘yxatga olingan qator: 31/B - 12 Xdfu */
export function formatRegistrationLine(
  region?: string,
  registrationIndex?: string | number | null,
  grif?: string
): string {
  const letter = getRegionLetter(region);
  if (!letter && (registrationIndex == null || registrationIndex === '')) {
    return '';
  }
  const reg =
    registrationIndex != null && registrationIndex !== '' ?
      String(registrationIndex)
    : '';
  const grifPart = formatGrifDisplay(grif);
  const parts = [`31/${letter}`];
  if (reg) parts.push(`- ${reg}`);
  else if (letter) parts.push('-');
  if (grifPart) parts.push(grifPart);
  return parts.join(' ');
}

/** 31/V - registrationIndex + grif (xat sarlavhasi va ilova) */
export function formatRegistrationLineSlash(
  region?: string,
  registrationIndex?: string | number | null,
  grif?: string
): string {
  const letter = getRegionLetter(region);
  const reg =
    registrationIndex != null && registrationIndex !== '' ?
      String(registrationIndex)
    : '';
  const grifPart = formatGrifDisplay(grif);

  if (!letter && !reg && !grifPart) return '';

  let line = letter ? `31/${letter}` : '31';
  if (reg) line += ` - ${reg}`;
  if (grifPart) line += grifPart;
  return line;
}

/** Ilova qatori: sarlavha, 31/V - registrationIndex + grif */
export function formatIlovaAttachmentLabel(att: {
  title?: string;
  ownerRegion?: string;
  registrationIndex?: string | number | null;
  grif?: string;
}): string {
  const title = att.title?.trim() || 'Hujjat';
  const meta = formatRegistrationLineSlash(
    att.ownerRegion,
    att.registrationIndex,
    att.grif
  );
  return meta ? `${title}, ${meta}` : title;
}

function registrationDisplayDate(document: DocumentType): DateLike | undefined {
  if (
    document.status === DocumentStatus.REGISTERED ||
    document.status === DocumentStatus.ACCEPTED
  ) {
    return document.updatedAt ?? document.createdAt;
  }
  return document.createdAt;
}

/** Pastki qism: reg. raqam + grif + sana */
export function DocumentRegistrationBlock({
  document,
  province,
  showRegPrefix = false,
  className = 'mt-2 mb-2 w-full text-lg',
}: {
  document: DocumentType;
  province?: string;
  showRegPrefix?: boolean;
  className?: string;
}) {
  const line = formatRegistrationLine(
    province ?? document.ownerRegion,
    document.registrationIndex,
    document.grif
  );
  if (!line) return null;

  const dateStr = formatDocDateUz(registrationDisplayDate(document));

  return (
    <div className={className}>
      <span className="inline-block align-top w-[400px] max-w-full whitespace-normal">
        {showRegPrefix ?
          <>
            <i>Reg: </i>
            <i>{line}</i>
          </>
        : <i>{line}</i>}
        {dateStr ?
          <>
            <br />
            <i className="mt-1 block">{dateStr}</i>
          </>
        : null}
      </span>
    </div>
  );
}

export function parseDocDate(date?: DateLike): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'object' && '$date' in date) {
    const d = new Date(date.$date);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDocDateUz(date?: DateLike): string {
  const parsed = parseDocDate(date);
  if (!parsed) return '';
  try {
    const year = format(parsed, 'yyyy');
    const day = format(parsed, 'dd');
    const month = format(parsed, 'MMMM', { locale: uz }).toLowerCase();
    return `${year} yil "${day}"-${month}`;
  } catch {
    return '';
  }
}

/** Familiya ism otasining ismi → qisqa ko‘rinish (I.O. Familiya) */
/** Hujjat boshi: «1-Nusxa» yoki «2 / 3-Nusxa» */
export function resolveDocumentCopyLabel(doc: {
  copyIndex?: number;
  copyTotal?: number;
  copyNumber?: string[];
}): string {
  if (typeof doc.copyIndex === 'number' && doc.copyIndex > 0) {
    if (typeof doc.copyTotal === 'number' && doc.copyTotal > 1) {
      return `${doc.copyIndex} / ${doc.copyTotal}-Nusxa`;
    }
    return `${doc.copyIndex}-Nusxa`;
  }
  const fallback = Math.max(doc.copyNumber?.length ?? 0, 1);
  return `${fallback}-Nusxa`;
}

function isPatronymicPart(part: string): boolean {
  return /(?:ovich|evich|ovna|evna|ogli|ogly|qizi)$/i.test(part.trim());
}

export function formatShortName(fullName?: string): string {
  if (!fullName?.trim()) return '';
  const twoLetterPrefixes = ['Sh', 'Ch', 'Dj', 'Zh', 'Kh'];
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0];
  }

  const fmt = (part: string) =>
    !part ? ''
    : twoLetterPrefixes.includes(part.substring(0, 2)) ? part.substring(0, 2)
    : part.charAt(0).toUpperCase();

  // Qisqa ko'rinish: Ism + Ota ismi bosh harfi, Familiya to'liq.
  // Masalan: "Abror Yoqubov Abrorovich" -> "A.A. Yoqubov"
  if (parts.length >= 3) {
    const ota = parts.slice(2).join(' ');
    const a = parts[0] ?? '';
    const b = parts[1] ?? '';
    const otaLast = parts[parts.length - 1] ?? '';

    if (isPatronymicPart(otaLast)) {
      // Ism va otasining ismi odatda bir xil bosh harf bilan boshlanadi (Abror / Abrorovich).
      const ismFirst =
        a.charAt(0).toLowerCase() === otaLast.charAt(0).toLowerCase() ? a : b;
      const familiya = ismFirst === a ? b : a;
      const otaInitial = fmt(ota);
      const ismInitial = fmt(ismFirst);
      return otaInitial ?
          `${ismInitial}.${otaInitial}. ${familiya}`.trim()
        : `${ismInitial}. ${familiya}`.trim();
    }
  }

  if (parts.length === 2) {
    return `${fmt(parts[0])}. ${parts[1]}`.trim();
  }

  return fullName.trim();
}

export function getCommanderCommentMeta(doc: DocumentType) {
  const text = doc.forwardedComment?.trim() || '';
  const signerName = (() => {
    if (doc.forwardedSigner?.fullName?.trim())
      return doc.forwardedSigner.fullName.trim();
    const fb = doc.forwardedBy as
      | {
          fullName?: string;
          personal?: { name?: string; fName?: string; sName?: string };
        }
      | string
      | undefined;
    if (fb && typeof fb === 'object') {
      if (fb.fullName?.trim()) return fb.fullName.trim();
      if (fb.personal) {
        return [fb.personal.name, fb.personal.fName, fb.personal.sName]
          .filter(Boolean)
          .join(' ');
      }
    }
    return '';
  })();

  const date =
    doc.forwardedAt ??
    doc.forwardedSigner?.signedAt ??
    doc.updatedAt ??
    doc.createdAt;
  const showQr =
    (doc.forwardedSigner?.hasSigned ?? !!signerName) && !!signerName;

  return { text, signerName, date, showQr };
}

/** Komandir imzolagan, lekin izoh qoldirmagan */
export function isCommanderSignedWithoutComment(doc: DocumentType): boolean {
  if (doc.forwardedComment?.trim()) return false;
  const bos = resolveBosSignedParty(doc);
  return !!bos?.hasSigned;
}

/** Yuqori chap: izohsiz komandir imzosi (QR + qisqa F.I.Sh.) yoki izoh bloki */
export function CommanderSignatureMark({
  document,
}: {
  document: DocumentType;
}) {
  if (!isCommanderSignedWithoutComment(document)) return null;

  const party = resolveBosSignedParty(document);
  if (!party?.fullName?.trim()) return null;

  return (
    <div className="inline-flex items-center gap-1.5 text-slate-900">
      <div className="relative size-9 shrink-0">
        <QrCode fullNames={party.fullName} size={36} logoSize={14} />
      </div>
      <span className="text-sm font-semibold leading-tight">
        {formatShortName(party.fullName)}
      </span>
    </div>
  );
}

/** Yuqori chap: komandir izohi / imzo; yuqori o‘ng: grif */
export function DocumentTopHeader({
  document,
  copyCount,
  showCommanderLeft = true,
}: {
  document: DocumentType;
  copyCount?: number;
  showCommanderLeft?: boolean;
}) {
  const commander = getCommanderCommentMeta(document);
  const nusxaLabel =
    copyCount != null ?
      `${copyCount}-Nusxa`
    : resolveDocumentCopyLabel(document);
  const showCommanderMark =
    showCommanderLeft && isCommanderSignedWithoutComment(document);
  const showLeft =
    showCommanderLeft && (!!commander.text || showCommanderMark);

  return (
    <div
      className={`mb-1 flex items-start gap-4 ${
        showLeft ? 'justify-between' : 'justify-end'
      }`}>
      {showLeft ?
        <div className="max-w-[58%] text-left">
          {commander.text ?
            <>
              <p className="commander-comment-hand whitespace-pre-wrap">
                {commander.text}
              </p>
              <div
                className="mt-1.5 max-w-[min(100%,280px)] border-b-[2.5px] border-slate-800"
                aria-hidden
              />
              <div className="mt-2 flex items-end gap-2">
                {commander.showQr ?
                  <div className="relative size-9 shrink-0">
                    <QrCode
                      fullNames={commander.signerName}
                      size={36}
                      logoSize={14}
                    />
                  </div>
                : null}
                {formatDocDateUz(commander.date) ?
                  <i className="text-base text-slate-700">
                    {formatDocDateUz(commander.date)}
                  </i>
                : null}
              </div>
            </>
          : <CommanderSignatureMark document={document} />}
        </div>
      : null}
      <div className="flex shrink-0 flex-col items-end text-right">
        {formatGrifDisplay(document.grif) ?
          <p>{formatGrifDisplay(document.grif)}</p>
        : null}
        <p>{nusxaLabel}</p>
      </div>
    </div>
  );
}

/** «KO‘RILDI»: faqat QR + qisqa F.I.Sh. */
export function KorildiSignerBlock({ party }: { party: DocumentParty }) {
  if (!party.hasSigned || !party.fullName?.trim()) return null;

  const displayName = formatShortName(party.fullName);

  return (
    <div className="mt-2 mb-2 w-full text-lg font-bold">
      <span className="inline-flex items-center gap-2">
        <span className="shrink-0">
          <QrCode fullNames={party.fullName} size={30} logoSize={10} />
        </span>
        {displayName ? <span>{displayName}</span> : null}
      </span>
    </div>
  );
}

/** Imzo qatori: lavozim, unvon, QR, F.I.Sh. */
export function SignerBlock({
  party,
  showQr = true,
  date,
  nameFormat = 'short',
}: {
  party: DocumentParty;
  showQr?: boolean;
  date?: DateLike;
  nameFormat?: 'short' | 'full';
}) {
  if (!hasPartyData(party)) return null;

  const displayName =
    nameFormat === 'full' ? party.fullName : formatShortName(party.fullName);
  const dateStr = formatDocDateUz(date);

  return (
    <div className="mt-2 mb-2 w-full text-lg">
      <span className="min-w-[40%]">
        {party.position ?
          <span className="inline-block align-top font-bold w-[400px] overflow-hidden text-ellipsis whitespace-normal">
            {party.position}
          </span>
        : null}
        {party.position ?
          <br />
        : null}
        <span className="flex flex-wrap items-center gap-4 font-bold">
          {party.militaryRank ?
            <span>{party.militaryRank}</span>
          : null}
          {showQr && party.hasSigned && party.fullName ?
            <span>
              <QrCode fullNames={party.fullName} />
            </span>
          : null}
          {displayName ?
            <span>{displayName}</span>
          : null}
        </span>
        {dateStr ?
          <i className="mt-1 block">{dateStr}</i>
        : null}
      </span>
    </div>
  );
}

/** Faqat `approvers` ro‘yxati — komandir bu yerda ko‘rsatilmaydi */
export function ApproversKelishildi({
  document,
}: {
  document: DocumentType;
  /** @deprecated Komandir endi kelishildi blokida chiqmaydi */
  includeBosSigned?: boolean;
}) {
  const approvers = (document.approvers ?? []).filter((a) =>
    hasPartyData(resolveApproverParty(a))
  );

  if (approvers.length === 0) return null;

  return (
    <div className="mt-10">
      {approvers.map((approver, index) => (
        <SignerBlock
          key={approver._id?.toString() ?? `approver-${index}`}
          party={resolveApproverParty(approver)}
          showQr={!!approver.hasSigned}
          date={approver.signedAt ?? document.createdAt}
        />
      ))}
    </div>
  );
}

/** Komandir yuborgan navbat — imzolanganlar QR bilan */
export function ForwardedReviewersNote({
  document,
}: {
  document: DocumentType;
}) {
  const queue =
    Array.isArray(document.forwardedTo) ?
      document.forwardedTo
        .filter(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            'fullName' in item &&
            !!(item as { fullName?: string }).fullName?.trim()
        )
        .map((item) => {
          const row = item as {
            fullName?: string;
            position?: string;
            militaryRank?: string;
            hasSigned?: boolean;
            order?: number;
            signedAt?: DateLike;
          };
          return {
            position: row.position?.trim() || '',
            militaryRank: row.militaryRank?.trim() || '',
            fullName: row.fullName?.trim() || '',
            hasSigned: !!row.hasSigned,
            signedAt: row.signedAt,
            order: typeof row.order === 'number' ? row.order : 0,
          };
        })
        .sort((a, b) => a.order - b.order)
    : [];

  const signedQueue = queue.filter((entry) => entry.hasSigned);
  if (signedQueue.length === 0) return null;

  return (
    <div className="mt-8">
      {signedQueue.map((entry, i) => (
        <KorildiSignerBlock
          key={`fwd-${i}`}
          party={{
            position: entry.position,
            militaryRank: entry.militaryRank,
            fullName: entry.fullName,
            hasSigned: entry.hasSigned,
          }}
        />
      ))}
    </div>
  );
}

export function sanitizeDocumentHtml(html: unknown): string {
  if (typeof html !== 'string' || !html.trim()) return '';
  return html;
}

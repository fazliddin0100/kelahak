import HTMLtoDOCX from 'html-to-docx';
import type { DocumentType } from '@/types/document';
import {
  formatDocDateUz,
  formatGrifDisplay,
  formatRegistrationLine,
  hasPartyData,
  resolveApproverParty,
  resolveAuthorParty,
  resolveDocumentCopyLabel,
  type DocumentParty,
} from '@/namunalar/documentViewShared';
import { sanitizeDocumentContent } from '@/lib/purify';

/** 1 sm = 567 twip. O'zDSt: chap 3 sm, o'ng 1,5 sm, yuqori/pastki 2 sm */
const CM = 567;

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function partyHtml(party: DocumentParty, date?: unknown): string {
  if (!hasPartyData(party)) return '';
  const nameLine = [party.militaryRank, party.fullName].filter(Boolean).map(esc).join('&nbsp;&nbsp;&nbsp;');
  const dateStr = formatDocDateUz(date as Parameters<typeof formatDocDateUz>[0]);
  return [
    '<p style="margin-top: 18pt; margin-bottom: 0">',
    party.position ? `<b>${esc(party.position)}</b><br/>` : '',
    nameLine ? `<b>${nameLine}</b>` : '',
    party.hasSigned ? ' <i>(E-IMZO bilan imzolangan)</i>' : '',
    dateStr ? `<br/><i>${esc(dateStr)}</i>` : '',
    '</p>',
  ].join('');
}

/** Hujjatning barcha rekvizitlari bilan Word uchun HTML */
export function buildDocumentWordHtml(doc: DocumentType): string {
  const grif = formatGrifDisplay(doc.grif);
  const copyLabel = resolveDocumentCopyLabel(doc);
  const content = sanitizeDocumentContent(doc.content);
  const author = resolveAuthorParty(doc);
  const approvers = (doc.approvers ?? [])
    .map((a) => ({ party: resolveApproverParty(a), date: a.signedAt ?? doc.createdAt }))
    .filter((a) => hasPartyData(a.party));
  const regLine = formatRegistrationLine(doc.ownerRegion, doc.registrationIndex, doc.grif);
  const regDate = formatDocDateUz(
    (doc as DocumentType & { registeredAt?: string }).registeredAt ?? doc.updatedAt ?? doc.createdAt
  );

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<p style="text-align: right; margin: 0">${grif ? `${esc(grif)}<br/>` : ''}${esc(copyLabel)}</p>
<div>${content || '<p></p>'}</div>
${partyHtml(author, doc.createdAt)}
${approvers.length ? `<p style="margin-top: 18pt"><b>KELISHILDI:</b></p>${approvers.map((a) => partyHtml(a.party, a.date)).join('')}` : ''}
${regLine ? `<p style="margin-top: 18pt"><i>${esc(regLine)}</i>${regDate ? `<br/><i>${esc(regDate)}</i>` : ''}</p>` : ''}
</body></html>`;
}

export async function buildDocumentDocx(
  doc: DocumentType,
  meta: { printedBy: string; requestId: string }
): Promise<Buffer> {
  const html = buildDocumentWordHtml(doc);
  const printedAt = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
  const footer = `<p style="font-size: 8pt; color: #555555">Chop etish uchun berildi: ${esc(printedAt)}, ${esc(meta.printedBy)}, so'rov № ${esc(meta.requestId.slice(-8))}</p>`;

  const result = await HTMLtoDOCX(html, null, {
    orientation: 'portrait',
    margins: { top: 2 * CM, right: Math.round(1.5 * CM), bottom: 2 * CM, left: 3 * CM, header: 720, footer: 720, gutter: 0 },
    font: 'Times New Roman',
    fontSize: 28, // yarim punktlarda: 14pt
    complexScriptFontSize: 28,
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    title: doc.title ?? 'Hujjat',
    creator: 'Mezon',
    lang: 'uz-UZ',
    decodeUnicode: true,
  }, footer);

  if (Buffer.isBuffer(result)) return result;
  if (result instanceof ArrayBuffer) return Buffer.from(result);
  // Blob (brauzer muhiti) — serverda kelmaydi, lekin ehtiyot uchun
  return Buffer.from(await (result as Blob).arrayBuffer());
}

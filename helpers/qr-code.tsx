import { JSX } from 'react';
import ReactQrCode from 'react-qr-code';
import Image from 'next/image';
import logo from '@/public/dxxLogo.png';

/** QR ichiga yoziladigan imzolovchi ma'lumoti */
export type QrSigner = {
  fullName?: string;
  position?: string;
  militaryRank?: string;
  organization?: string;
  /** Date, ISO satr yoki { $date } */
  signedAt?: unknown;
};

interface QrCodeWithLogoProps {
  /** Imzolovchi: F.I.Sh, lavozim, unvon, tashkilot, imzo vaqti */
  party?: QrSigner | null;
  /** Eski chaqiruvlar uchun: faqat F.I.Sh */
  fullNames?: string;
  size?: number;
  logoSize?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatSignedAt(v: QrSigner['signedAt']): string {
  if (!v) return '';
  const raw = typeof v === 'object' && v !== null && '$date' in v ? (v as { $date: unknown }).$date : v;
  if (!(raw instanceof Date) && typeof raw !== 'string' && typeof raw !== 'number') return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** QR matni (qisqa — kichik QR telefon bilan o'qilishi uchun) */
export function qrSignerText(party: QrSigner | null | undefined, fallbackName?: string): string {
  const name = party?.fullName?.trim() || fallbackName?.trim() || '';
  const job = [party?.position?.trim(), party?.militaryRank?.trim()].filter(Boolean).join(', ');
  const lines = [
    name && `F.I.Sh: ${name}`,
    job && `Lavozim: ${job}`,
    party?.organization?.trim() && `Tashkilot: ${party.organization.trim()}`,
    formatSignedAt(party?.signedAt) && `Imzolandi: ${formatSignedAt(party?.signedAt)}`,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') : "Noma'lum";
}

const QrCode = ({ party, fullNames, size = 50, logoSize }: QrCodeWithLogoProps): JSX.Element => {
  const qrValue = qrSignerText(party, fullNames);
  const centerLogo = logoSize ?? Math.max(14, Math.round(size * 0.4));

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
      title={qrValue}>
      <ReactQrCode
        value={qrValue}
        size={size}
        level="H"
        style={{ display: 'block', width: size, height: size }}
      />
      {logo ?
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 flex items-center justify-center rounded bg-white p-px"
          style={{
            width: centerLogo + 4,
            height: centerLogo + 4,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}>
          <Image
            src={logo}
            alt={party?.fullName || fullNames || ''}
            width={centerLogo}
            height={centerLogo}
            className="object-contain"
            style={{ width: centerLogo, height: centerLogo }}
          />
        </span>
      : null}
    </span>
  );
};

export default QrCode;

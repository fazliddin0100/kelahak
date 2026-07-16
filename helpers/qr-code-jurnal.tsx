import { JSX } from 'react';
import ReactQrCode from 'react-qr-code';
import Image from 'next/image';
import logo from '@/public/dxxLogo.png';

interface QrCodeJurnalProps {
  fullNames?: string;
  /** QR o‘lchami (px), jurnal ustuni uchun kichik */
  size?: number;
  logoSize?: number;
}

const QrCodeJurnal = ({
  fullNames,
  size = 36,
  logoSize,
}: QrCodeJurnalProps): JSX.Element => {
  const qrValue = fullNames || "Noma'lum";
  const centerLogo = logoSize ?? Math.max(10, Math.round(size * 0.32));

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
          className="pointer-events-none absolute left-1/2 top-1/2 flex items-center justify-center rounded bg-white p-px shadow-sm"
          style={{
            width: centerLogo + 4,
            height: centerLogo + 4,
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}>
          <Image
            src={logo}
            alt=""
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

export default QrCodeJurnal;

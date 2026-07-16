import { JSX } from 'react';
import ReactQrCode from 'react-qr-code';
import Image from 'next/image';
import logo from '@/public/dxxLogo.png';

interface QrCodeWithLogoProps {
  fullNames?: string;
  size?: number;
  logoSize?: number;
}

const QrCode = ({
  fullNames,
  size = 50,
  logoSize,
}: QrCodeWithLogoProps): JSX.Element => {
  const qrValue = fullNames || "Noma'lum";
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
            alt={qrValue}
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

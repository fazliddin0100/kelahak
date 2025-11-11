import { JSX } from 'react';
import ReactQrCode from 'react-qr-code';

interface QrCodeWithLogoProps {
  fullNames?: string[];
  logoBase64?: string;
}

const QrCode = ({
  fullNames,
  logoBase64,
}: QrCodeWithLogoProps): JSX.Element => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ReactQrCode
        value={(fullNames || []).join(', ') || "Noma'lum"}
        size={50}
        level="H" // Yuqori xato tuzatish darajasi
      />
      {logoBase64 && (
        <img
          src={logoBase64}
          alt={(fullNames || []).join(', ')}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 20,
            height: 20,
            transform: 'translate(-50%, -50%)',
            borderRadius: '6px',
            backgroundColor: 'white',
            padding: '2px',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
};

export default QrCode;

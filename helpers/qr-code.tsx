import { JSX } from 'react';
import ReactQrCode from 'react-qr-code';
import Image from "next/image";
import logo from '@/public/dxxLogo.png'

interface QrCodeWithLogoProps {
    fullNames?: string;
}

const QrCode = ({
                    fullNames,
                }: QrCodeWithLogoProps): JSX.Element => {
    // Convert array to string safely
    const qrValue = fullNames || "Noma'lum";

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <ReactQrCode
                value={qrValue}
                size={50}
                level="H" // Yuqori xato tuzatish darajasi
            />
            {logo && (
                <Image
                    src={logo}
                    alt={qrValue}
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

// lib/antivirus.ts
import net from 'node:net';

export type ScanResult =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  | { status: 'skipped' };

const CHUNK_BYTES = 64 * 1024;
const SCAN_TIMEOUT_MS = 60_000;

/**
 * Faylni ClamAV daemon (clamd) orqali INSTREAM protokoli bilan tekshiradi —
 * diskka vaqtinchalik fayl yozilmaydi.
 *
 * CLAMAV_HOST / CLAMAV_PORT sozlanmagan bo‘lsa tekshiruv o‘tkazib yuboriladi;
 * ANTIVIRUS_REQUIRED=true bo‘lsa yoki clamd sozlangan-u javob bermasa, xato
 * tashlanadi va fayl qabul qilinmaydi.
 */
export async function scanBuffer(buffer: Buffer): Promise<ScanResult> {
  const host = process.env.CLAMAV_HOST?.trim();
  if (!host) {
    if (process.env.ANTIVIRUS_REQUIRED === 'true') {
      throw new Error('Antivirus majburiy, lekin CLAMAV_HOST sozlanmagan.');
    }
    return { status: 'skipped' };
  }
  const port = Number.parseInt(process.env.CLAMAV_PORT ?? '3310', 10);

  const reply = await new Promise<string>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    socket.setTimeout(SCAN_TIMEOUT_MS, () => {
      socket.destroy(new Error('ClamAV javob bermadi (timeout).'));
    });
    socket.once('error', reject);
    socket.on('data', (chunk) => chunks.push(chunk));
    socket.once('end', () =>
      resolve(Buffer.concat(chunks).toString('utf8').replace(/\0/g, '').trim())
    );
    socket.once('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += CHUNK_BYTES) {
        const part = buffer.subarray(offset, offset + CHUNK_BYTES);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(part.length, 0);
        socket.write(size);
        socket.write(part);
      }
      socket.end(Buffer.alloc(4));
    });
  });

  if (/\bOK$/.test(reply)) return { status: 'clean' };
  const found = /^stream: (.+) FOUND$/.exec(reply);
  if (found) return { status: 'infected', signature: found[1] };
  throw new Error(`ClamAV kutilmagan javob qaytardi: ${reply.slice(0, 200)}`);
}

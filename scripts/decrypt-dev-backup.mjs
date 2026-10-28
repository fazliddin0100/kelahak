import 'dotenv/config';

import { createDecipheriv } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Foydalanish: node scripts/decrypt-dev-backup.mjs <.mxd/.mxf> <chiqish-fayli>');
  process.exit(2);
}

const keyPath = path.resolve(
  process.env.APP_ENCRYPTION_KEY_FILE ?? 'secrets/app-encryption-key'
);
const rawKey = readFileSync(keyPath, 'utf8').trim();
if (!/^[a-f\d]{64}$/i.test(rawKey)) {
  throw new Error('APP_ENCRYPTION_KEY_FILE ichida 32 baytli (64 hex) kalit bo‘lishi kerak.');
}
const key = Buffer.from(rawKey, 'hex');
const handle = await open(inputPath, 'r');
const stat = await handle.stat();
if (stat.size < 32) {
  await handle.close();
  throw new Error('Backup fayli juda kichik yoki buzilgan.');
}
const prefix = Buffer.alloc(32);
await handle.read(prefix, 0, prefix.length, 0);
const header = prefix.subarray(0, 4).toString('ascii');
let iv;
let tag;
let dataStart;
let dataEnd;

if (header === 'MXF1') {
  iv = prefix.subarray(4, 16);
  tag = prefix.subarray(16, 32);
  dataStart = 32;
  dataEnd = stat.size - 1;
} else if (header === 'MXD1') {
  iv = prefix.subarray(4, 16);
  tag = Buffer.alloc(16);
  await handle.read(tag, 0, tag.length, stat.size - 16);
  dataStart = 16;
  dataEnd = stat.size - 17;
} else {
  await handle.close();
  throw new Error('Backup formati tanilmadi.');
}
await handle.close();

const decipher = createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);
try {
  await pipeline(
    createReadStream(inputPath, { start: dataStart, end: dataEnd }),
    decipher,
    createWriteStream(outputPath, { flags: 'wx', mode: 0o600 })
  );
} catch (error) {
  await unlink(outputPath).catch(() => undefined);
  throw error;
}
console.info(`Shifri yechildi: ${path.resolve(outputPath)}`);

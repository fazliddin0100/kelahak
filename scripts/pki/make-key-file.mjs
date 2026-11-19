// Mezon E-IMZO: PKCS#8 (DER) yopiq kalitni parol bilan shifrlangan .mzk fayliga aylantiradi.
// Format brauzerdagi WebCrypto bilan ochiladi: PBKDF2-SHA256 -> AES-256-GCM.
//
// Ishlatish: MZK_PASSWORD='...' node scripts/pki/make-key-file.mjs <kalit.pk8> <chiqish.mzk>
import { createCipheriv, pbkdf2Sync, randomBytes, createPrivateKey } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ITERATIONS = 600_000;
const [input, output] = process.argv.slice(2);
const password = process.env.MZK_PASSWORD ?? '';

if (!input || !output) {
  console.error('Ishlatish: MZK_PASSWORD=... node make-key-file.mjs <kalit.pk8> <chiqish.mzk>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Xato: kalit paroli kamida 8 belgi bo‘lsin.');
  process.exit(1);
}

const pkcs8 = readFileSync(input);
const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
  console.error('Xato: faqat EC P-256 (prime256v1) kaliti qo‘llanadi.');
  process.exit(1);
}

const salt = randomBytes(16);
const iv = randomBytes(12);
const aesKey = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
// WebCrypto AES-GCM shifrlangan matn va 16 baytli tegni ketma-ket kutadi
const data = Buffer.concat([cipher.update(pkcs8), cipher.final(), cipher.getAuthTag()]);

const file = {
  format: 'mezon-key/v1',
  algorithm: 'ECDSA-P256',
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64') },
  cipher: { name: 'AES-GCM', iv: iv.toString('base64') },
  data: data.toString('base64'),
};
writeFileSync(output, JSON.stringify(file, null, 2), { mode: 0o600, flag: 'wx' });
console.log(`Kalit fayli yozildi: ${output}`);

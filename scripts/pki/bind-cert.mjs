// Mezon E-IMZO: sertifikatni userga SERVER kompyuterida, panelsiz biriktirish.
// Ishlatiladi: (1) birinchi marta SuperAdmin'ga sertifikat berishda — EIMZO_REQUIRED=true
// yoqilishidan oldin; (2) SuperAdmin kalitini yo'qotib, panelga kira olmay qolganda.
// Bazaga to'g'ridan-to'g'ri yozadi — faqat server administratori ishlatadi.
//
// Ishlatish: node scripts/pki/bind-cert.mjs <login> <sertifikat.crt> [--revoke-others]
import { createRequire } from 'node:module';
import { randomBytes, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const [loginArg, certFile, flag] = process.argv.slice(2);
if (!loginArg || !certFile) {
  console.error('Ishlatish: node scripts/pki/bind-cert.mjs <login> <sertifikat.crt> [--revoke-others]');
  process.exit(1);
}
const login = loginArg.trim().toLowerCase();
const fail = (msg) => {
  console.error(`Xato: ${msg}`);
  process.exit(1);
};

const caFile = process.env.EIMZO_CA_CERT_FILE || path.join(process.cwd(), 'secrets', 'pki', 'ca.crt');
const ca = new X509Certificate(readFileSync(caFile));
const cert = new X509Certificate(readFileSync(certFile));

// Ilovadagi lib/eimzo/verify.ts bilan bir xil tekshiruvlar
if (cert.ca) fail('bu CA sertifikati, foydalanuvchi sertifikati emas.');
if (!cert.checkIssued(ca) || !cert.verify(ca.publicKey)) fail(`sertifikatni ${caFile} bermagan.`);
const now = new Date();
if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) fail('sertifikat muddati amal qilmaydi.');
const key = cert.publicKey;
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') fail('faqat EC P-256 kaliti.');
const uid = cert.subject.split('\n').find((l) => l.startsWith('UID='))?.slice(4);
if (uid && uid.toLowerCase() !== login) fail(`sertifikat «${uid}» uchun, «${login}» uchun emas.`);

const db = new PrismaClient();
try {
  const auth = await db.auth.findUnique({ where: { login }, select: { userId: true } });
  if (!auth) fail(`«${login}» loginli foydalanuvchi yo'q.`);
  const exists = await db.userCertificate.findUnique({ where: { fingerprint256: cert.fingerprint256 } });
  if (exists) fail('bu sertifikat allaqachon biriktirilgan.');

  if (flag === '--revoke-others') {
    const r = await db.userCertificate.updateMany({
      where: { userId: auth.userId, status: 'active' },
      data: { status: 'revoked', revokedAt: now, revokedReason: 'bind-cert.mjs: yangi sertifikat bilan almashtirildi' },
    });
    if (r.count) console.log(`Eski faol sertifikatlar bekor qilindi: ${r.count}`);
  }

  await db.userCertificate.create({
    data: {
      id: randomBytes(12).toString('hex'),
      userId: auth.userId,
      fingerprint256: cert.fingerprint256,
      serialNumber: cert.serialNumber,
      subject: cert.subject,
      issuer: cert.issuer,
      notBefore: new Date(cert.validFrom),
      notAfter: new Date(cert.validTo),
      pem: cert.toString(),
    },
  });
  await db.securityLog.create({
    data: {
      id: randomBytes(12).toString('hex'),
      type: 'admin_action',
      ip: '127.0.0.1',
      path: 'scripts/pki/bind-cert.mjs',
      method: 'CLI',
      loginHint: 'server-admin',
      message: `E-IMZO sertifikati biriktirildi (CLI): ${login}; SHA-256 ${cert.fingerprint256.slice(0, 23)}…`,
      statusCode: 200,
    },
  });
  console.log(`Tayyor: «${login}» ga sertifikat biriktirildi (${cert.subject.replace(/\n/g, ', ')}).`);
} finally {
  await db.$disconnect();
}

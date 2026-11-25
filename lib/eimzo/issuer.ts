import 'reflect-metadata'; // @peculiar/x509 (tsyringe) uchun talab qilinadi — birinchi import bo'lishi shart
import { randomBytes, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as x509 from '@peculiar/x509';
import { EimzoError, issuingCaCertFile, loadIssuingCa, parseAndValidateCertificate } from './verify';

/**
 * Oraliq (imzolovchi) CA bilan userlar sertifikatlarini serverda avtomatik imzolash.
 * Bosh CA kaliti serverda YO'Q — faqat oraliq CA kaliti (EIMZO_ISSUING_CA_KEY_FILE).
 */
x509.cryptoProvider.set(webcrypto as unknown as Crypto);

const CERT_DAYS = 730;
const UID_OID = '0.9.2342.19200300.100.1.1';

function issuingKeyFile(): string {
  return (
    process.env.EIMZO_ISSUING_CA_KEY_FILE ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'secrets', 'pki', 'issuing-ca.key')
  );
}

export function isAutoIssueConfigured(): boolean {
  try {
    readFileSync(issuingKeyFile());
    return !!loadIssuingCa();
  } catch {
    return false;
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const buf = Buffer.from(b64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadIssuingKey(): Promise<CryptoKey> {
  let pem: string;
  try {
    pem = readFileSync(issuingKeyFile(), 'utf8');
  } catch {
    throw new EimzoError('Serverda oraliq CA kaliti sozlanmagan (secrets/pki/issuing-ca.key).', 'CA_MISSING');
  }
  return webcrypto.subtle.importKey('pkcs8', pemToDer(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]) as Promise<CryptoKey>;
}

export type IssuedCertificate = { pem: string; uid: string };

/**
 * PKCS#10 so'rovni tekshirib (imzo, P-256, UID = kutilgan login) userga sertifikat chiqaradi.
 * Natija tizimning o'z tekshiruvidan (parseAndValidateCertificate) o'tkaziladi.
 */
export async function issueUserCertificate(csrPem: string, expectedLogin: string): Promise<IssuedCertificate> {
  const issuingPem = (() => {
    try {
      return readFileSync(issuingCaCertFile(), 'utf8');
    } catch {
      throw new EimzoError('Serverda oraliq CA sertifikati sozlanmagan.', 'CA_MISSING');
    }
  })();
  if (!loadIssuingCa()) throw new EimzoError('Oraliq CA bosh CA bilan tasdiqlanmadi yoki muddati o‘tgan.', 'UNTRUSTED');

  let csr: x509.Pkcs10CertificateRequest;
  try {
    csr = new x509.Pkcs10CertificateRequest(csrPem);
  } catch {
    throw new EimzoError('Sertifikat so‘rovini (.csr) o‘qib bo‘lmadi.', 'BAD_CERT');
  }
  if (!(await csr.verify())) throw new EimzoError('So‘rov imzosi noto‘g‘ri.', 'BAD_SIGNATURE');
  const alg = csr.publicKey.algorithm as EcKeyAlgorithm;
  if (alg.name !== 'ECDSA' || alg.namedCurve !== 'P-256') {
    throw new EimzoError('Faqat EC P-256 kaliti qabul qilinadi.', 'BAD_KEY');
  }
  const uid = csr.subjectName.getField(UID_OID)[0] ?? csr.subjectName.getField('UID')[0] ?? '';
  if (uid.toLowerCase() !== expectedLogin.toLowerCase()) {
    throw new EimzoError(`So‘rovdagi login «${uid}», kutilgani «${expectedLogin}».`, 'BAD_CERT');
  }

  const issuer = new x509.X509Certificate(issuingPem);
  const signingKey = await loadIssuingKey();
  const now = Date.now();
  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: randomBytes(16).toString('hex').replace(/^[89a-f]/, '1'),
    subject: csr.subjectName,
    issuer: issuer.subjectName,
    notBefore: new Date(now - 5 * 60 * 1000),
    notAfter: new Date(now + CERT_DAYS * 24 * 60 * 60 * 1000),
    signingAlgorithm: { name: 'ECDSA', hash: 'SHA-256' },
    publicKey: csr.publicKey,
    signingKey,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.nonRepudiation, true),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.clientAuth], false),
      await x509.SubjectKeyIdentifierExtension.create(csr.publicKey),
      await x509.AuthorityKeyIdentifierExtension.create(issuer),
    ],
  });
  const pem = cert.toString('pem');
  parseAndValidateCertificate(pem); // tizim tekshiruvidan o'tishi shart
  return { pem, uid };
}

/** Userga beriladigan zanjir: oraliq CA + bosh CA (ochiq sertifikatlar) */
export function caChainPem(): string {
  const root = readFileSync(
    process.env.EIMZO_CA_CERT_FILE || path.join(/*turbopackIgnore: true*/ process.cwd(), 'secrets', 'pki', 'ca.crt'),
    'utf8'
  );
  let issuing = '';
  try {
    issuing = readFileSync(issuingCaCertFile(), 'utf8');
  } catch {
    issuing = '';
  }
  return `${issuing.trim()}\n${root.trim()}\n`;
}

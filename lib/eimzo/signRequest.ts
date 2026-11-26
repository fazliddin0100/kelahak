import type { DeviceAttestation } from './agentClient';

/**
 * Hujjatni E-IMZO bilan imzolash so'rovi: istalgan joydan `requestEimzoSignature()` chaqiriladi,
 * sahifadagi <EimzoSignHost /> oynani ochadi va foydalanuvchi imzolagach natijani qaytaradi.
 */

export type DocumentSignChallenge = {
  documentId: string;
  title: string;
  contentHash: string;
  challengeId: string;
  nonce: string;
  expiresAt: string;
  /** true — Mezon agenti tasdig'isiz imzo qabul qilinmaydi */
  deviceRequired?: boolean;
};

export type EimzoSignResult = {
  challengeId: string;
  origin: string;
  certPem: string;
  signature: string;
  /** Mezon agenti tasdig'i (kompyuter) */
  device?: DeviceAttestation;
};

type Pending = {
  challenge: DocumentSignChallenge;
  resolve: (result: EimzoSignResult | null) => void;
};

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function documentSignMessage(c: DocumentSignChallenge, origin: string): string {
  return `mezon-sign|v1|${c.documentId}|${c.contentHash}|${c.challengeId}|${c.nonce}|${origin}`;
}

/** Oynani ochadi. Foydalanuvchi bekor qilsa null qaytadi. */
export function requestEimzoSignature(challenge: DocumentSignChallenge): Promise<EimzoSignResult | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { challenge, resolve };
    notify();
  });
}

export function finishEimzoSignature(result: EimzoSignResult | null) {
  const current = pending;
  pending = null;
  notify();
  current?.resolve(result);
}

export function subscribeEimzoSign(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingEimzoSign(): DocumentSignChallenge | null {
  return pending?.challenge ?? null;
}

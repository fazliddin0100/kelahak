import { EIMZO_AGENT_ORIGIN } from './agentOrigin';

/**
 * Brauzer tomoni: kompyuterdagi Mezon agentidan (127.0.0.1) imzo so'rovi uchun kompyuter tasdig'ini olish.
 * Agent server bergan nonce ni MAC lar, disk seriyasi va qurilma kaliti barmoq izi bilan birga imzolaydi.
 */

export type DeviceAttestation = {
  format: 'v2';
  usbSerial: string;
  usbSerialReliable: boolean;
  usbModel: string;
  keySha256: string;
  mac: string;
  macs: string;
  diskSerial: string;
  diskModel: string;
  diskSerialReliable: boolean;
  hardwareKey: boolean;
  hostname: string;
  publicKey: string;
  publicKeySha256: string;
  signature: string;
};

export class AgentUnavailableError extends Error {}

/** Kalit yozilgan fleshka kompyuterdan olib qo'yilgan */
export class KeyNotOnUsbError extends AgentUnavailableError {}

const LOOPBACK = { targetAddressSpace: 'loopback' } as Record<string, unknown>;

/**
 * Imzo uchun kompyuter tasdig'i: agent MAC, disk seriyasi va `keySha256` kalit fayli shu paytda
 * ulangan fleshkada turganini (fleshka seriyasi bilan) imzolaydi. Fleshka yo'q bo'lsa KeyNotOnUsbError.
 */
export async function getDeviceAttestation(nonce: string, keySha256: string, timeoutMs = 8000): Promise<DeviceAttestation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${EIMZO_AGENT_ORIGIN}/v1/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, origin: window.location.origin, keySha256 }),
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      // Chrome: lokal manzilga so'rov (Local Network Access) — brauzer birinchi marta ruxsat so'raydi
      ...({ targetAddressSpace: 'loopback' } as Record<string, unknown>),
    });
  } catch {
    throw new AgentUnavailableError(
      'Kompyuterda «Mezon agenti» topilmadi yoki brauzer unga ulanishga ruxsat bermadi.'
    );
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 403) {
    throw new AgentUnavailableError('Mezon agenti bu saytga ruxsat bermagan (AllowedOrigins sozlamasi).');
  }
  const data = (await res.json().catch(() => null)) as (DeviceAttestation & { title?: string; error?: string }) | null;
  if (res.status === 409 && data?.error === 'key_not_on_usb') {
    throw new KeyNotOnUsbError('E-IMZO kaliti yozilgan fleshka kompyuterga ulanmagan.');
  }
  if (!res.ok || !data?.signature) {
    throw new AgentUnavailableError(data?.title || 'Mezon agenti kompyuter tasdig‘ini bermadi.');
  }
  if (data.format !== 'v2') {
    throw new AgentUnavailableError('Kompyuterdagi «Mezon agenti» eski — 1.1 versiyasini o‘rnating.');
  }
  return data;
}

export type UsbKey = {
  fileName: string;
  drive: string;
  /** .mzk matni (kalit paroli bilan shifrlangan) */
  keyFile: string;
  keySha256: string;
  /** Kalit yonidagi .crt (bo'lmasa null) */
  certPem: string | null;
  usbSerial: string;
  usbSerialReliable: boolean;
  usbModel: string;
};

/** Ulangan fleshkalardagi E-IMZO kalitlari. Agent yo'q yoki eski bo'lsa null. */
export async function listUsbKeys(timeoutMs = 8000): Promise<UsbKey[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EIMZO_AGENT_ORIGIN}/v1/keys`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      ...LOOPBACK,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { keys?: UsbKey[] };
    return Array.isArray(data?.keys) ? data.keys : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Kalit fleshkasi hali ulanganmi. Agent javob bermasa ham false (kalit yopiladi). */
export async function isKeyOnUsb(keySha256: string, timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EIMZO_AGENT_ORIGIN}/v1/key/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keySha256 }),
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      ...LOOPBACK,
    });
    if (!res.ok) return false;
    return ((await res.json()) as { present?: boolean }).present === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export type AgentInfo = {
  hostname: string;
  mac: string;
  macs: { mac: string; description: string; up: boolean }[];
  diskSerial: string;
  diskModel: string;
  diskSerialReliable: boolean;
  publicKeySha256: string;
  hardwareKey: boolean;
};

/** Kompyuter ma'lumoti (imzosiz) — ro'yxatdan o'tishda kompyuterni userga yozish uchun. Agent yo'q bo'lsa null. */
export async function getAgentInfo(timeoutMs = 3000): Promise<AgentInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${EIMZO_AGENT_ORIGIN}/v1/info`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      ...({ targetAddressSpace: 'loopback' } as Record<string, unknown>),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AgentInfo;
    return Array.isArray(data?.macs) && data.macs.length > 0 ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

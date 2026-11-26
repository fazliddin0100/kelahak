import { EIMZO_AGENT_ORIGIN } from './agentOrigin';

/**
 * Brauzer tomoni: kompyuterdagi Mezon agentidan (127.0.0.1) imzo so'rovi uchun kompyuter tasdig'ini olish.
 * Agent server bergan nonce ni MAC lar, disk seriyasi va qurilma kaliti barmoq izi bilan birga imzolaydi.
 */

export type DeviceAttestation = {
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

export async function getDeviceAttestation(nonce: string, timeoutMs = 5000): Promise<DeviceAttestation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${EIMZO_AGENT_ORIGIN}/v1/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: nonce, origin: window.location.origin }),
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
  const data = (await res.json().catch(() => null)) as (DeviceAttestation & { title?: string }) | null;
  if (!res.ok || !data?.signature) {
    throw new AgentUnavailableError(data?.title || 'Mezon agenti kompyuter tasdig‘ini bermadi.');
  }
  return data;
}

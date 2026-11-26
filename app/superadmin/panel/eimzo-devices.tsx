'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Loader2, MonitorX } from 'lucide-react';
import { useState } from 'react';

type Device = {
  id: string;
  userId: string;
  login: string;
  fullName: string;
  hostname: string;
  primaryMac: string;
  macs: string;
  diskSerial: string;
  diskModel: string;
  diskSerialReliable: boolean;
  hardwareKey: boolean;
  publicKeySha256: string;
  status: 'active' | 'revoked';
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
};

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('uz-UZ') : '—');

/** Mezon agenti orqali birinchi imzoda ro'yxatga olingan kompyuterlar */
export default function EimzoDevicesCard() {
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['superadmin-eimzo-devices'],
    queryFn: async (): Promise<{ deviceRequiredGlobally: boolean; devices: Device[] }> => {
      const r = await fetch('/api/superadmin/devices', { cache: 'no-store' });
      if (!r.ok) throw new Error('devices');
      return r.json();
    },
  });
  const devices = data?.devices ?? [];

  const revoke = async (d: Device) => {
    const reason = window.prompt(
      `«${d.login}» kompyuteri (${d.hostname || d.primaryMac}) bekor qilinsinmi? Keyingi imzoda yangi kompyuter yoziladi.\nSabab:`,
      'Kompyuter almashtirildi'
    );
    if (reason === null) return;
    setBusy(d.id);
    try {
      const r = await fetch(`/api/superadmin/devices/${encodeURIComponent(d.id)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const res = (await r.json().catch(() => ({}))) as { message?: string };
      if (r.ok) toast.success(res.message || 'Bekor qilindi');
      else toast.error(res.message || 'Bekor qilib bo‘lmadi');
      void refetch();
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Cpu className="size-4 text-primary" />
        E-IMZO kompyuterlari ({devices.filter((d) => d.status === 'active').length})
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        User birinchi imzoni «Mezon agenti» o‘rnatilgan kompyuterdan qo‘yganda kompyuter (qurilma kaliti, MAC, disk
        seriyasi) yoziladi. Keyingi imzolar faqat shu kompyuterdan qabul qilinadi.{' '}
        {data?.deviceRequiredGlobally ?
          <b>Agentsiz imzo hamma uchun taqiqlangan.</b>
        : 'Kompyuteri hali yozilmagan userlar agentsiz ham imzolay oladi (EIMZO_DEVICE_REQUIRED=true bilan taqiqlanadi).'}
      </p>

      {isLoading ?
        <p className="mt-3 text-sm text-slate-500">Yuklanmoqda...</p>
      : devices.length === 0 ?
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Hali kompyuter yozilmagan.</p>
      : <ul className="mt-3 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {devices.map((d) => (
            <li key={d.id} className={cn('flex flex-wrap items-start gap-3 px-3 py-2.5 text-sm', d.status !== 'active' && 'opacity-60')}>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="font-medium text-slate-800">
                  {d.fullName || d.login} <span className="font-mono text-xs text-slate-500">({d.login})</span>
                  {d.status !== 'active' && <span className="ml-2 text-xs font-normal text-red-600">bekor qilingan</span>}
                </p>
                <p className="text-xs text-slate-600">
                  {d.hostname || '—'} · MAC <span className="font-mono">{d.macs.split(',').join(', ')}</span>
                </p>
                <p className="text-xs text-slate-600">
                  Disk: {d.diskModel || '—'} <span className="font-mono">{d.diskSerial}</span>
                  {!d.diskSerialReliable && <span className="text-amber-700"> (seriya noyob emas)</span>} · kalit{' '}
                  {d.hardwareKey ? 'TPM' : 'dasturiy'}
                </p>
                <p className="text-xs text-slate-400">
                  Yozilgan: {fmt(d.createdAt)} · oxirgi imzo: {fmt(d.lastSeenAt)}
                  {d.revokedAt && <> · bekor: {fmt(d.revokedAt)} ({d.revokedReason})</>}
                </p>
              </div>
              {d.status === 'active' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={busy === d.id}
                  onClick={() => void revoke(d)}>
                  {busy === d.id ? <Loader2 className="size-4 animate-spin" /> : <MonitorX className="size-4" />}
                  Bekor qilish
                </Button>
              )}
            </li>
          ))}
        </ul>
      }
    </section>
  );
}

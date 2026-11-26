'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Loader2, MonitorX } from 'lucide-react';
import { useCallback, useState } from 'react';
import { StatusPill, TablePager, TableSearch, useSearchPaging } from './table-tools';

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
  usbSerial: string;
  usbSerialReliable: boolean;
  usbModel: string;
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

  const haystack = useCallback(
    (d: Device) =>
      [d.fullName, d.login, d.hostname, d.macs, d.diskSerial, d.diskModel, d.usbSerial, d.usbModel].join(' '),
    []
  );
  const t = useSearchPaging(devices, haystack, 25);
  const active = devices.filter((d) => d.status === 'active').length;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Cpu className="size-4 text-primary" />
          E-IMZO kompyuterlari ({active} faol)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          User birinchi imzoni «Mezon agenti» o‘rnatilgan kompyuterdan qo‘yganda kompyuter (qurilma kaliti, MAC, disk
          seriyasi) va kalit turgan fleshka yoziladi. Keyingi imzolar faqat shu kompyuterdan va shu fleshka ulangan
          holda qabul qilinadi.{' '}
          {data?.deviceRequiredGlobally ?
            <b>Agentsiz imzo hamma uchun taqiqlangan.</b>
          : 'Kompyuteri hali yozilmagan userlar agentsiz ham imzolay oladi (EIMZO_DEVICE_REQUIRED=true bilan taqiqlanadi).'}
        </p>
      </div>

      <TableSearch
        value={t.query}
        onChange={t.setQuery}
        placeholder="F.I.Sh, login, kompyuter, MAC, disk yoki fleshka seriyasi..."
        label="Kompyuterlarni qidirish"
      />

      {isLoading ?
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      : devices.length === 0 ?
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Hali kompyuter yozilmagan.</p>
      : t.total === 0 ?
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">«{t.query}» bo‘yicha hech narsa topilmadi.</p>
      : <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Kompyuter / MAC</th>
                  <th className="px-3 py-2">Disk</th>
                  <th className="px-3 py-2">Kalit fleshkasi</th>
                  <th className="px-3 py-2">Qurilma kaliti</th>
                  <th className="px-3 py-2">Yozilgan / oxirgi imzo</th>
                  <th className="px-3 py-2">Holat</th>
                  <th className="px-3 py-2 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {t.rows.map((d) => (
                  <tr key={d.id} className={cn('align-top hover:bg-slate-50/70', d.status !== 'active' && 'text-slate-400')}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{d.fullName || '—'}</div>
                      <div className="text-slate-500">{d.login}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{d.hostname || '—'}</div>
                      <div className="font-mono text-[11px] text-slate-500" title={d.macs.split(',').join(', ')}>
                        {d.primaryMac}
                        {d.macs.split(',').length > 1 && <span className="text-slate-400"> +{d.macs.split(',').length - 1}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="max-w-[160px] truncate" title={d.diskModel}>{d.diskModel || '—'}</div>
                      <div className="max-w-[160px] truncate font-mono text-[11px] text-slate-500" title={d.diskSerial}>
                        {d.diskSerial}
                      </div>
                      {!d.diskSerialReliable && <div className="text-[11px] text-amber-700">seriya noyob emas</div>}
                    </td>
                    <td className="px-3 py-2">
                      {d.usbSerial ?
                        <>
                          <div className="max-w-[160px] truncate" title={d.usbModel}>{d.usbModel || '—'}</div>
                          <div className="font-mono text-[11px] text-slate-500">{d.usbSerial}</div>
                          {!d.usbSerialReliable && <div className="text-[11px] text-amber-700">seriya noyob emas</div>}
                        </>
                      : <span className="text-slate-400">keyingi imzoda</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{d.hardwareKey ? 'TPM' : 'Dasturiy'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>{fmt(d.createdAt)}</div>
                      <div className="text-slate-500">{fmt(d.lastSeenAt)}</div>
                    </td>
                    <td className="px-3 py-2">
                      {d.status === 'active' ?
                        <StatusPill tone="green">Faol</StatusPill>
                      : <StatusPill tone="red" title={d.revokedReason ?? ''}>
                          Bekor qilingan
                        </StatusPill>}
                      {d.revokedAt && (
                        <div className="mt-1 max-w-[160px] text-[11px] text-slate-500">
                          {fmt(d.revokedAt)}
                          {d.revokedReason ? ` · ${d.revokedReason}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {d.status === 'active' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={busy === d.id}
                          onClick={() => void revoke(d)}
                          aria-label={`${d.login} kompyuterini bekor qilish`}>
                          {busy === d.id ? <Loader2 className="size-3.5 animate-spin" /> : <MonitorX className="size-3.5" />}
                          Bekor qilish
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePager page={t.page} pageCount={t.pageCount} total={t.total} pageSize={t.pageSize} onPage={t.setPage} />
        </>
      }
    </section>
  );
}

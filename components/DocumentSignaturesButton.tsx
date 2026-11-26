'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';

type Signature = {
  id: string;
  signedAt: string;
  status: 'valid' | 'modified' | 'invalid';
  contentHash: string;
  currentHash: string | null;
  fingerprint256: string;
  certificateSubject: string;
  certificateRevokedAt: string | null;
  fullName: string;
  position: string;
  militaryRank: string;
  device: { hostname: string; mac: string; diskSerial: string; usbSerial?: string; verified: boolean } | null;
};

const STATUS = {
  valid: { label: 'Imzo haqiqiy', Icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  modified: { label: 'Hujjat imzodan keyin o‘zgartirilgan', Icon: ShieldAlert, tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  invalid: { label: 'Imzo haqiqiy emas', Icon: ShieldX, tone: 'bg-red-50 text-red-700 ring-red-200' },
} as const;

/** Hujjat sarlavhasidagi E-IMZO imzolar belgisi; bosilganda har bir imzoni tekshirish natijasi. */
export default function DocumentSignaturesButton({ documentId, version }: { documentId: string; version?: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['document-signatures', documentId, version],
    queryFn: async (): Promise<Signature[]> => {
      const res = await fetch(`/api/documents/${documentId}/signatures`, { cache: 'no-store' });
      if (!res.ok) return [];
      return (await res.json()).signatures ?? [];
    },
  });

  const signatures = data ?? [];
  if (signatures.length === 0) return null;

  const worst =
    signatures.some((s) => s.status === 'invalid') ? 'invalid'
    : signatures.some((s) => s.status === 'modified') ? 'modified'
    : 'valid';
  const { Icon, tone } = STATUS[worst];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
          tone
        )}>
        <Icon className="size-3.5" />
        E-IMZO: {signatures.length}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>E-IMZO imzolari</DialogTitle>
            <DialogDescription>
              Har bir imzo sertifikatning ochiq kaliti bilan qayta tekshirildi va hujjatning joriy mazmuni bilan
              solishtirildi.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {signatures.map((s) => {
              const st = STATUS[s.status];
              return (
                <li key={s.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{s.fullName || '—'}</p>
                      <p className="text-xs text-slate-500">
                        {[s.militaryRank, s.position].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', st.tone)}>
                      <st.Icon className="size-3.5" />
                      {st.label}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-600">
                    <dt className="text-slate-400">Vaqt</dt>
                    <dd>{new Date(s.signedAt).toLocaleString('uz-UZ')}</dd>
                    <dt className="text-slate-400">Sertifikat</dt>
                    <dd className="break-words">{s.certificateSubject}</dd>
                    <dt className="text-slate-400">Kompyuter</dt>
                    <dd className={s.device && !s.device.verified ? 'text-red-700' : undefined}>
                      {s.device ?
                        <>
                          {s.device.hostname || '—'} · MAC <span className="font-mono">{s.device.mac}</span> · disk{' '}
                          <span className="font-mono">{s.device.diskSerial}</span>
                          {s.device.usbSerial && (
                            <>
                              {' '}· fleshka <span className="font-mono">{s.device.usbSerial}</span>
                            </>
                          )}
                          {s.device.verified ? '' : ' (tasdiq imzosi noto‘g‘ri)'}
                        </>
                      : <span className="text-slate-400">tasdiqlanmagan (agentsiz)</span>}
                    </dd>
                    <dt className="text-slate-400">Imzolangan xesh</dt>
                    <dd className="break-all font-mono">{s.contentHash}</dd>
                    {s.status === 'modified' && (
                      <>
                        <dt className="text-slate-400">Joriy xesh</dt>
                        <dd className="break-all font-mono text-amber-700">{s.currentHash}</dd>
                      </>
                    )}
                    {s.certificateRevokedAt && (
                      <>
                        <dt className="text-slate-400">Bekor qilingan</dt>
                        <dd>{new Date(s.certificateRevokedAt).toLocaleString('uz-UZ')} (imzodan keyin)</dd>
                      </>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

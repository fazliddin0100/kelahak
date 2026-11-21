'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

type Transfer = {
  id: string;
  title: string;
  registrationIndex: number | null;
  note: string | null;
  at: string | null;
  fromName: string;
};

/** Joriy xodimga topshirilgan, qabul qilinishi kutilayotgan hujjatlar */
export default function IncomingTransfers() {
  const [rows, setRows] = useState<Transfer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/documents/transfers-incoming', { cache: 'no-store' });
    const data = res.ok ? await res.json() : { transfers: [] };
    return Array.isArray(data.transfers) ? (data.transfers as Transfer[]) : [];
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .then((r) => active && setRows(r))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load]);

  if (rows.length === 0) return null;

  const accept = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/documents/${id}/transfer/accept`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.message || 'Xatolik!');
      toast.success(data.message || 'Qabul qilindi');
      setRows((list) => list.filter((r) => r.id !== id));
    } catch {
      toast.error('Server xatosi!');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
      <div className="flex items-center gap-3 border-b border-amber-100 px-5 py-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <ArrowRightLeft className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Sizga topshirilgan hujjatlar</h2>
          <p className="text-xs text-slate-500">Qabul qilganingizdan keyin hujjat sizda saqlanadi</p>
        </div>
      </div>
      <ul className="divide-y divide-amber-100">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <Link href={`/document-open/${r.id}`} className="font-medium text-slate-800 hover:text-primary hover:underline">
                {r.title}
                {r.registrationIndex != null ? ` · № ${r.registrationIndex}` : ''}
              </Link>
              <p className="text-xs text-slate-500">
                {r.fromName}
                {r.at ? ` · ${new Date(r.at).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
              </p>
              {r.note && <p className="mt-0.5 text-sm text-slate-600">{r.note}</p>}
            </div>
            <Button size="sm" onClick={() => accept(r.id)} disabled={busy === r.id} className="gap-1.5">
              {busy === r.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Qabul qilish
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

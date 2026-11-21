'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Check, Download, Loader2, Printer, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { SectionShell, kotibiyatTdClass, kotibiyatThClass } from './section-shell';

type PrintRequestView = {
  id: string;
  documentId: string;
  documentTitle: string;
  registrationIndex: number | null;
  reason: string;
  status: string;
  decisionNote: string | null;
  requesterName: string;
  createdAt: string;
  decidedAt: string | null;
  downloadCount: number;
};

const STATUS: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Kutilmoqda', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { text: 'Tasdiqlangan', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { text: 'Rad etilgan', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '';

/** Kotibiyat: hujjat egalaridan kelgan chop etish so'rovlari (Word'ga yuklab olish) */
export default function PrintRequests() {
  const [rows, setRows] = useState<PrintRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PrintRequestView | null>(null);
  const [note, setNote] = useState('');

  const fetchRows = useCallback(async () => {
    const { data } = await axios.get<{ requests: PrintRequestView[] }>('/api/print-requests');
    return Array.isArray(data.requests) ? data.requests : [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchRows()
      .then((r) => active && setRows(r))
      .catch(() => active && toast.error('So‘rovlarni yuklab bo‘lmadi'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetchRows]);

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await fetchRows());
    } catch {
      toast.error('So‘rovlarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  };

  const replace = (updated: PrintRequestView) =>
    setRows((list) => list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));

  const download = async (row: PrintRequestView) => {
    setBusyId(row.id);
    try {
      const res = await axios.get(`/api/print-requests/${row.id}/docx`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hujjat-${row.registrationIndex ?? row.documentId.slice(-6)}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      replace({ ...row, downloadCount: row.downloadCount + 1 });
    } catch {
      toast.error('Word faylini yuklab bo‘lmadi');
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (row: PrintRequestView, action: 'approve' | 'reject', reasonNote = '') => {
    setBusyId(row.id);
    try {
      const { data } = await axios.patch(`/api/print-requests/${row.id}`, { action, note: reasonNote });
      replace(data.request);
      if (action === 'approve') {
        toast.success('Tasdiqlandi. Word fayl yuklanmoqda...');
        await download({ ...row, ...data.request });
      } else {
        toast.success('So‘rov rad etildi');
      }
      return true;
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || 'Amalni bajarib bo‘lmadi');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionShell
      title="Chop etish so‘rovlari"
      description="Siz ro‘yxatga olgan hujjatlarni chop etish uchun kelgan so‘rovlar. Tasdiqlangach hujjat Word shaklida yuklanadi."
      icon={Printer}
      actions={
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-2">
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Yangilash
        </Button>
      }>
      {loading && rows.length === 0 ?
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Yuklanmoqda...
        </div>
      : rows.length === 0 ?
        <p className="py-12 text-center text-sm text-slate-500">Hozircha so‘rov yo‘q.</p>
      : <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className={kotibiyatThClass}>Hujjat</th>
                <th className={kotibiyatThClass}>So‘ragan</th>
                <th className={kotibiyatThClass}>Sabab</th>
                <th className={kotibiyatThClass}>Holat</th>
                <th className={cn(kotibiyatThClass, 'text-right')}>Amal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className={kotibiyatTdClass}>
                    <p className="font-medium text-slate-800">{r.documentTitle}</p>
                    <p className="text-xs text-slate-500">
                      № {r.registrationIndex ?? '—'} · {fmt(r.createdAt)}
                    </p>
                  </td>
                  <td className={kotibiyatTdClass}>{r.requesterName}</td>
                  <td className={cn(kotibiyatTdClass, 'max-w-[320px] whitespace-pre-wrap')}>
                    {r.reason}
                    {r.decisionNote && (
                      <p className="mt-1 text-xs text-slate-500">Izoh: {r.decisionNote}</p>
                    )}
                  </td>
                  <td className={kotibiyatTdClass}>
                    <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', STATUS[r.status]?.cls)}>
                      {STATUS[r.status]?.text ?? r.status}
                    </span>
                    {r.downloadCount > 0 && (
                      <p className="mt-1 text-xs text-slate-500">Yuklandi: {r.downloadCount} marta</p>
                    )}
                  </td>
                  <td className={cn(kotibiyatTdClass, 'text-right')}>
                    <div className="flex justify-end gap-2">
                      {r.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => {
                              setNote('');
                              setRejecting(r);
                            }}
                            className="gap-1.5 text-red-600 hover:text-red-700">
                            <X className="size-4" /> Rad etish
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => decide(r, 'approve')}
                            className="gap-1.5">
                            {busyId === r.id ?
                              <Loader2 className="size-4 animate-spin" />
                            : <Check className="size-4" />}
                            Tasdiqlash va Word
                          </Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => download(r)}
                          className="gap-1.5">
                          {busyId === r.id ?
                            <Loader2 className="size-4 animate-spin" />
                          : <Download className="size-4" />}
                          Word yuklash
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      <Dialog open={!!rejecting} onOpenChange={(v) => !v && !busyId && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>So‘rovni rad etish</DialogTitle>
            <DialogDescription>
              «{rejecting?.documentTitle}» — sababini yozing, u so‘ragan xodimga ko‘rinadi.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Rad etish sababi"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={!!busyId}>
              Orqaga
            </Button>
            <Button
              variant="destructive"
              disabled={!!busyId || note.trim().length < 3}
              onClick={async () => {
                if (rejecting && (await decide(rejecting, 'reject', note.trim()))) setRejecting(null);
              }}>
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

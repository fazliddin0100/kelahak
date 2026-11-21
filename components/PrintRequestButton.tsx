'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, Printer } from 'lucide-react';
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

type RequestView = {
  id: string;
  status: string;
  reason: string;
  decisionNote: string | null;
  assigneeName: string;
  createdAt: string;
  decidedAt: string | null;
};

const STATUS: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Ko‘rib chiqilmoqda', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { text: 'Tasdiqlandi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { text: 'Rad etildi', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '';

/**
 * Ro'yxatga olingan hujjatni chop etish uchun kotibiyatga so'rov.
 * Tugma faqat hujjat egasiga va hujjat ro'yxatga olingandan keyin ko'rinadi (server tekshiradi).
 */
export default function PrintRequestButton({ documentId }: { documentId: string }) {
  const [printable, setPrintable] = useState(false);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/documents/${documentId}/print-requests`);
      setPrintable(!!data.printable);
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setPrintable(false); // egasi emas yoki hujjat topilmadi — tugma chiqmaydi
    }
  }, [documentId]);

  useEffect(() => {
    let active = true;
    axios
      .get(`/api/documents/${documentId}/print-requests`)
      .then(({ data }) => {
        if (!active) return;
        setPrintable(!!data.printable);
        setRequests(Array.isArray(data.requests) ? data.requests : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [documentId]);

  if (!printable) return null;

  const pending = requests.some((r) => r.status === 'pending');

  const submit = async () => {
    if (reason.trim().length < 5) {
      toast.error('Chop etish sababini yozing (kamida 5 belgi)');
      return;
    }
    setSending(true);
    try {
      await axios.post(`/api/documents/${documentId}/print-requests`, { reason: reason.trim() });
      toast.success('So‘rov kotibiyatga yuborildi');
      setReason('');
      await load();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg || 'So‘rovni yuborib bo‘lmadi');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 rounded-md border-slate-200 bg-white text-slate-700 hover:border-gold hover:bg-slate-50 hover:text-primary">
        <Printer className="size-4" />
        <span>Chop etish</span>
        {pending && <span className="size-2 rounded-full bg-amber-500" aria-label="So‘rov kutilmoqda" />}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5 text-primary" />
              Chop etish uchun so‘rov
            </DialogTitle>
            <DialogDescription>
              Hujjatni faqat uni ro‘yxatga olgan kotibiyat xodimi chop etadi. Sababni yozing — so‘rov
              unga yuboriladi.
            </DialogDescription>
          </DialogHeader>

          {!pending && (
            <div className="space-y-2">
              <label htmlFor="print-reason" className="text-sm font-medium text-slate-700">
                Chop etish sababi
              </label>
              <Textarea
                id="print-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Masalan: tashqi tashkilotga qog‘oz shaklida yuborish uchun"
              />
              <p className="text-right text-xs text-slate-400">{reason.length}/500</p>
            </div>
          )}

          {requests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Avvalgi so‘rovlar</p>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-md border border-slate-200 p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{fmt(r.createdAt)}</span>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs font-medium',
                          STATUS[r.status]?.cls
                        )}>
                        {STATUS[r.status]?.text ?? r.status}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">{r.reason}</p>
                    {r.decisionNote && (
                      <p className="mt-1 text-xs text-slate-500">Kotibiyat izohi: {r.decisionNote}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Yopish
            </Button>
            {!pending && (
              <Button onClick={submit} disabled={sending} className="gap-2">
                {sending && <Loader2 className="size-4 animate-spin" />}
                So‘rov yuborish
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

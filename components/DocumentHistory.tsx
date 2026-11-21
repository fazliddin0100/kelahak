'use client';

import { useEffect, useState } from 'react';
import { History, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type EventView = {
  id: string;
  type: string;
  actorName: string;
  note: string | null;
  targetName: string | null;
  createdAt: string;
};

const LABEL: Record<string, string> = {
  author_signed: 'Muallif imzoladi',
  returned: 'Boshliq qaytardi',
  commander_signed: 'Boshliq imzoladi',
  resolution: 'Rezolyutsiya berildi',
  acknowledged: 'Tanishdi (imzoladi)',
  reforwarded: 'Yana yo‘naltirdi',
  submitted_kotibiyat: 'Kotibiyatga yuborildi',
  registered: 'Ro‘yxatga olindi',
  transfer_requested: 'Topshirish uchun yuborildi',
  transfer_accepted: 'Qabul qilib oldi',
  transfer_cancelled: 'Topshirish bekor qilindi',
  linked_workfile: 'Ish jildiga biriktirildi',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });

function useEvents(documentId: string, version: string) {
  const [events, setEvents] = useState<EventView[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/documents/${documentId}/events`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => active && setEvents(Array.isArray(d.events) ? d.events : []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [documentId, version]);
  return events;
}

/** Hujjat tarixi: kim, qachon, nima qildi */
export function DocumentHistoryButton({ documentId, version }: { documentId: string; version: string }) {
  const [open, setOpen] = useState(false);
  const events = useEvents(documentId, version);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-6 gap-1 px-1.5 text-[11px] text-slate-600 hover:text-primary">
        <History className="size-3.5" />
        Tarix{events.length ? ` (${events.length})` : ''}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Hujjat tarixi
            </DialogTitle>
            <DialogDescription>Hujjat bilan bajarilgan barcha amallar</DialogDescription>
          </DialogHeader>
          {events.length === 0 ?
            <p className="py-6 text-center text-sm text-slate-500">Hozircha yozuv yo‘q.</p>
          : <ol className="max-h-[60vh] space-y-3 overflow-y-auto border-l border-slate-200 pl-4">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary/70" />
                  <p className="text-sm font-medium text-slate-800">
                    {LABEL[e.type] ?? e.type}
                    {e.targetName ? <span className="font-normal text-slate-600"> → {e.targetName}</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {e.actorName} · {fmt(e.createdAt)}
                  </p>
                  {e.note && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{e.note}</p>}
                </li>
              ))}
            </ol>
          }
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Boshliq qaytargan hujjat: oxirgi qaytarish sababi muallifga ko'rinadi */
export function ReturnNotice({ documentId, version, status }: { documentId: string; version: string; status?: string }) {
  const events = useEvents(documentId, version);
  if (status !== 'yangi') return null;
  const last = [...events].reverse().find((e) => e.type === 'returned' || e.type === 'author_signed');
  if (!last || last.type !== 'returned') return null;
  return (
    <div className="mx-4 mt-3 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:mx-6">
      <Undo2 className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">
          Boshliq qaytardi: {last.actorName} · {fmt(last.createdAt)}
        </p>
        <p className="mt-1 whitespace-pre-wrap">{last.note}</p>
        <p className="mt-1 text-xs text-amber-700">Xatolarni tuzating va hujjatni qayta imzolang.</p>
      </div>
    </div>
  );
}
